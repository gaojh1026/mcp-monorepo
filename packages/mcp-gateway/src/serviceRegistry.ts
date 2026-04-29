/**
 * @fileoverview MCP 服务注册表
 * 自动扫描并加载所有 MCP 服务
 * @module mcp-gateway/serviceRegistry
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { MCPServer } from 'mcp-framework';

/**
 * package.json 的类型定义（仅包含我们关心的字段）
 */
type PackageJson = {
    name?: string;
    version?: string;
};

/**
 * 本地 MCP 服务（由网关在同进程创建 MCPServer，并管理每个 session 的 transport/sdksrv）
 */
export type LocalMcpService = {
    type: 'local';
    id: string;
    packageDir: string;
    basePath: string;
    server: MCPServer;
    sessions: Map<string, { transport: any; sdkServer: any }>;
};

/**
 * 远程 MCP 服务（外部进程对外提供 HTTP/SSE endpoint，网关仅负责 spawn/就绪探测/反向代理）
 */
export type ExternalMcpService = {
    type: 'external';
    id: string;
    spawn: {
        command: string;
        args: string[];
        cwd?: string;
        env?: Record<string, string>;
        shell?: boolean;
    };
    upstream: {
        baseUrl: string;
        path: string;
    };
    ready: {
        type: 'tcp';
        host: string;
        port: number;
        timeoutMs: number;
    };
    /**
     * 外部进程引用：仅当网关负责 spawn 时存在。
     * 若端口本来就已就绪，可选择跳过 spawn，此时 process 可能为 undefined。
     */
    process?: ChildProcess;
};

/**
 * 单个 MCP 服务的完整信息
 */
export type McpService = LocalMcpService | ExternalMcpService;

/**
 * 异步读取 JSON 文件
 * @template T - JSON 对象类型
 * @param path - 文件路径
 * @returns 解析后的 JSON 对象
 */
const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T;

/**
 * 根据环境选择服务源码路径
 * - 生产模式: 使用 dist 目录（编译后的代码）
 * - 开发模式: 使用 src 目录（源代码）
 * @param packageDir - 包目录路径
 * @returns 源码路径，或 null（路径不存在）
 */
const pickBasePath = (packageDir: string) => {
    const distTools = join(packageDir, 'dist', 'tools');
    const srcTools = join(packageDir, 'src', 'tools');
    if (existsSync(distTools)) return join(packageDir, 'dist');
    if (existsSync(srcTools)) return join(packageDir, 'src');
    if (process.env.MCP_GATEWAY_DEV === '1') return join(packageDir, 'src');
    return null;
};

/**
 * 可能是相对路径则基于 baseDir 解析为绝对路径
 * @param baseDir - 基础目录
 * @param maybeRelativePath - 待解析路径
 */
const resolveMaybeRelative = (baseDir: string, maybeRelativePath: string) => {
    if (isAbsolute(maybeRelativePath)) return maybeRelativePath;
    return resolve(baseDir, maybeRelativePath);
};

type ExternalServicesConfigFile = {
    externalServices?: Record<
        string,
        {
            spawn: {
                command: string;
                args: string[];
                cwd?: string;
                env?: Record<string, string>;
                shell?: boolean;
            };
            upstream: {
                baseUrl: string;
                path: string;
            };
            ready: {
                type: 'tcp';
                host: string;
                port: number;
                timeoutMs: number;
            };
        }
    >;
};

/**
 * 加载所有 MCP 服务
 * 自动扫描 packages/mcp-* 目录（排除 mcp-gateway 自身）
 * @param repoRoot - 仓库根目录路径
 * @returns 服务 ID 到服务实例的映射
 */
export const loadServices = async (repoRoot: string): Promise<Map<string, McpService>> => {
    const packagesDir = resolve(repoRoot, 'packages');
    const entries = await readdir(packagesDir, { withFileTypes: true });

    const services = new Map<string, McpService>();

    for (const entry of entries) {
        // 1. 跳过非目录
        if (!entry.isDirectory()) continue;
        // 2. 只处理 mcp-* 命名的包
        if (!entry.name.startsWith('mcp-')) continue;
        // 3. 排除 mcp-gateway 自身（避免自引用）
        if (entry.name === 'mcp-gateway') continue;

        // 提取服务 ID（如 'fetch' 来自 'mcp-fetch'）
        const id = entry.name.slice('mcp-'.length);
        const packageDir = join(packagesDir, entry.name);
        // 读取 package.json 获取服务名称和版本
        const pkg = await readJson<PackageJson>(join(packageDir, 'package.json'));

        // 确定源码路径（dist 或 src）
        const basePath = pickBasePath(packageDir);
        if (!basePath) {
            continue;
        }

        // 创建 MCPServer 实例
        const server = new MCPServer({
            name: pkg.name ?? `mcp-${id}`,
            version: pkg.version ?? '0.0.0',
            basePath,
            logging: true,
        });

        // 预加载 tools/prompts/resources，加快后续路由速度
        try {
            await (server as any).ensureInitialized?.();
        } catch (error) {
            console.error(`Failed to initialize service ${id}:`, error);
            // 继续，不影响其他服务
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

    // 额外加载外部（自定义）MCP 服务
    const externalConfigPath = resolve(repoRoot, 'packages', 'mcp-gateway', 'mcp-gateway.external-services.json');
    const configDir = resolve(repoRoot, 'packages', 'mcp-gateway');
    try {
        const externalConfig = await readJson<ExternalServicesConfigFile>(externalConfigPath);
        const externalServices = externalConfig.externalServices;
        if (externalServices) {
            for (const [id, cfg] of Object.entries(externalServices)) {
                const spawnCwd = cfg.spawn.cwd ? resolveMaybeRelative(configDir, cfg.spawn.cwd) : undefined;
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
        }
    } catch (err: any) {
        // 若配置文件不存在则静默跳过：保持向后兼容
        if (err?.code !== 'ENOENT') {
            console.error(`[mcp-gateway] Failed to load external services config:`, err);
        }
    }

    return services;
};
