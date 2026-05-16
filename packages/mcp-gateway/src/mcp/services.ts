/**
 * @fileoverview 网关 MCP 服务注册表：扫描本地 `packages/mcp-*` 包，合并 `external-services.json`；
 * 外部服务支持子进程 spawn、TCP 就绪与 HTTP(S) 反代。
 * @module mcp-gateway/mcp/services
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { join, resolve } from 'node:path';
import { MCPServer } from 'mcp-framework';

import { AuthProvider } from './authProvider.js';
import type { ExternalMcpService, ExternalServicesConfigFile, McpService } from '../type.js';
import {
    MCP_GATEWAY_CORS_ALLOW_HEADERS,
    MCP_GATEWAY_CORS_EXPOSE_HEADERS,
    buildReverseProxyForwardHeaders,
    buildReverseProxyTargetUrl,
    isTcpPortOpen,
    readJsonFile,
    resolveMaybeRelative,
    waitForTcpReady,
} from '../utils/utils.js';

// ========================================================================= 类型与常量 ==========================================================================

/** MCP 包前缀 */
const MCP_PACKAGE_PREFIX = 'mcp-';
/** 网关包目录 */
const GATEWAY_PACKAGE_DIR = 'mcp-gateway';
/** 外部服务配置文件 */
const EXTERNAL_SERVICES_FILE = 'external-services.json';

// ========================================================================= 模块一：本地服务 & 外部服务 ==========================================================================

/**
 * 为 {@link MCPServer} 选择含 `tools` 子目录的根：`dist/tools` → `src/tools`；
 * `MCP_GATEWAY_DEV=1` 时可回退到 `src`；否则返回 `null`（跳过该包）。
 */
const pickBasePath = (packageDir: string): string | null => {
    const distTools = join(packageDir, 'dist', 'tools');
    const srcTools = join(packageDir, 'src', 'tools');
    if (existsSync(distTools)) return join(packageDir, 'dist');
    if (existsSync(srcTools)) return join(packageDir, 'src');
    if (process.env.MCP_GATEWAY_DEV === '1') return join(packageDir, 'src');
    return null;
};

/**
 * @description 服务一：本地服务 扫描 `packages` 下 `mcp-*` 目录（排除网关自身），写入 `services`。
 * @param packagesDir - `repoRoot/packages`
 */
const registerLocalMcpPackages = async (packagesDir: string, services: Map<string, McpService>): Promise<void> => {
    const entries = await readdir(packagesDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.startsWith(MCP_PACKAGE_PREFIX)) continue;
        if (entry.name === GATEWAY_PACKAGE_DIR) continue;

        const id = entry.name.slice(MCP_PACKAGE_PREFIX.length);
        const packageDir = join(packagesDir, entry.name);
        const pkg = await readJsonFile<{
            name: string;
            version: string;
        }>(join(packageDir, 'package.json'));
        const basePath = pickBasePath(packageDir);
        if (!basePath) continue;

        const server = new MCPServer({
            name: pkg.name ?? `mcp-${id}`,
            version: pkg.version ?? '0.0.0',
            basePath,
            logging: process.env.MCP_LOGGING !== 'false',
            tasks: {
                enabled: true,
                defaultTtl: 300_000,
                maxTasks: 100,
            },
            transport: {
                type: 'http-stream',
                options: {
                    auth: {
                        provider: new AuthProvider(),
                        endpoints: { sse: true, messages: true },
                    },
                },
            },
        });

        try {
            const maybeInit = server as unknown as { ensureInitialized?: () => Promise<void> };
            await maybeInit.ensureInitialized?.();
        } catch (error) {
            console.error(`Failed to initialize service ${id}:`, error);
        }

        services.set(id, {
            type: 'local',
            id,
            packageDir,
            basePath,
            server,
            sessions: new Map(),
        });
    }
};

/**
 * @description 服务二：外部服务 读取 `packages/mcp-gateway/external-services.json` 并合并进 `services`（同 id 以外部为准）。
 * `ENOENT` 静默跳过；其它错误打日志且不抛错。
 */
const mergeExternalServicesFromConfig = async (repoRoot: string, services: Map<string, McpService>): Promise<void> => {
    const gatewayDir = resolve(repoRoot, 'packages', GATEWAY_PACKAGE_DIR);
    const configPath = join(gatewayDir, EXTERNAL_SERVICES_FILE);

    try {
        const externalConfig = await readJsonFile<ExternalServicesConfigFile>(configPath);
        const externalServices = externalConfig.externalServices;
        if (!externalServices) return;

        for (const [id, cfg] of Object.entries(externalServices)) {
            const spawnCwd = cfg.spawn.cwd ? resolveMaybeRelative(gatewayDir, cfg.spawn.cwd) : undefined;
            if (services.has(id)) {
                console.warn(`[mcp-gateway] external service '${id}' overrides existing local service`);
            }
            services.set(id, {
                type: 'external',
                id,
                spawn: {
                    command: cfg.spawn.command,
                    args: cfg.spawn.args ?? [],
                    cwd: spawnCwd,
                    env: cfg.spawn.env ?? {},
                    shell: cfg.spawn.shell ?? false,
                },
                upstream: {
                    baseUrl: cfg.upstream.baseUrl,
                    path: cfg.upstream.path,
                },
                ready: {
                    type: 'tcp',
                    host: cfg.ready.host,
                    port: cfg.ready.port,
                    timeoutMs: cfg.ready.timeoutMs,
                },
            });
        }
    } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
        if (code !== 'ENOENT') {
            console.error(`❌ [mcp-gateway] Failed to load external services config:`, err);
        }
    }
};

// ---------------------------------------------------------------------------
// 外部服务：进程与反代
// ---------------------------------------------------------------------------
/** 端口快速检查间隔 */
const TCP_QUICK_CHECK_MS = 300;

/** 端口未开则 spawn，并阻塞至 TCP 就绪。 */
const ensureOneExternalServiceReady = async (service: ExternalMcpService): Promise<void> => {
    const portOpen = await isTcpPortOpen(service.ready.host, service.ready.port, TCP_QUICK_CHECK_MS);
    if (!portOpen) {
        const env = { ...process.env, ...(service.spawn.env ?? {}) };
        const child = spawn(service.spawn.command, service.spawn.args, {
            cwd: service.spawn.cwd,
            env,
            shell: service.spawn.shell ?? false,
            stdio: 'inherit',
        });
        service.process = child;
        child.once('exit', (code, signal) => {
            console.warn(`[mcp-gateway] external service '${service.id}' exited (code=${code}, signal=${signal})`);
        });
    }
    await waitForTcpReady(service.ready.host, service.ready.port, service.ready.timeoutMs);
};

// ========================================================================= 模块二：加载全部 MCP 服务 ==========================================================================

/**
 * @description加载全部 MCP 服务（本地包 + 外部 JSON）。
 * @param repoRoot - monorepo 根目录
 */
export const loadServices = async (repoRoot: string): Promise<Map<string, McpService>> => {
    const services = new Map<string, McpService>();
    const packagesDir = resolve(repoRoot, 'packages');
    // 服务一：本地服务
    await registerLocalMcpPackages(packagesDir, services);
    // 服务二：外部服务
    await mergeExternalServicesFromConfig(repoRoot, services);
    return services;
};

/**
 * 为所有 `external` 类型服务在需要时 spawn，并等待 TCP 就绪。
 */
export const ensureExternalServicesStarted = async (services: Map<string, McpService>): Promise<void> => {
    const externalList = Array.from(services.values()).filter((s): s is ExternalMcpService => s.type === 'external');
    await Promise.all(externalList.map((service) => ensureOneExternalServiceReady(service)));
};

/**
 * 将请求转发到外部服务的 upstream（含流式响应与 CORS 头）。
 */
export const proxyExternalRequest = async (req: IncomingMessage, res: ServerResponse, service: ExternalMcpService, url: URL): Promise<void> => {
    const targetUrl = buildReverseProxyTargetUrl(service.upstream.baseUrl, service.upstream.path, url);
    const proxyHeaders = buildReverseProxyForwardHeaders(req, targetUrl);
    const requester = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;

    await new Promise<void>((resolvePromise, rejectPromise) => {
        const proxyReq = requester(
            {
                method: req.method,
                protocol: targetUrl.protocol,
                hostname: targetUrl.hostname,
                port: targetUrl.port,
                path: targetUrl.pathname + targetUrl.search,
                headers: proxyHeaders,
            },
            (proxyRes) => {
                const corsHeaders: Record<string, string> = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': MCP_GATEWAY_CORS_ALLOW_HEADERS,
                    'Access-Control-Expose-Headers': MCP_GATEWAY_CORS_EXPOSE_HEADERS,
                };
                if (!res.headersSent) {
                    res.writeHead(proxyRes.statusCode ?? 502, Object.assign({}, proxyRes.headers as Record<string, unknown>, corsHeaders));
                }
                proxyRes.pipe(res);
                proxyRes.on('end', () => resolvePromise());
            }
        );

        proxyReq.on('error', (err) => rejectPromise(err));
        req.on('aborted', () => proxyReq.destroy());
        req.pipe(proxyReq);
    }).catch((err: unknown) => {
        if (res.headersSent) return;
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(502).end(`Bad Gateway: ${message}`);
    });
};
