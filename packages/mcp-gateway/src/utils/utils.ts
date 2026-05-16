/**
 * @fileoverview 网关工具与运行时常量：环境、文件与仓库、`.env`、路径、TCP、HTTP 反代 URL/转发头、HTTP body、CORS、JSON-RPC/OAuth 错误体、MCP 路由解析。
 * @module mcp-gateway/utils/utils
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { dirname, isAbsolute, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// 运行时常量（端口、主机、请求体、对外 MCP 路径前缀、CORS 头列表）
// ---------------------------------------------------------------------------

/** 网关HTTP服务器端口 */
export const getPort = (): number => Number(process.env.PORT ?? 8787);
/** 网关HTTP服务器监听地址 */
export const getHost = (): string => process.env.HOST ?? '0.0.0.0';
/** 请求体最大字节数 */
export const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 4 * 1024 * 1024);
/** 网关对外 MCP 路由前缀；公网路径形如 `/fe/{serviceId}/mcp`。与前端 `app-front-mcp` 的 `GATEWAY_MCP_ROUTE_PREFIX` 保持一致。 */
export const MCP_GATEWAY_SERVICE_ROUTE_PREFIX = '/fe';
/**
 * 网关与反代上游 MCP（含 Context7 Streamable HTTP）共用的 CORS 允许请求头列表（不含 `Cookie`；
 * 启用 {@link resolveCredentialAwareCors} 时会在运行期追加 `Cookie`）。
 */
export const MCP_GATEWAY_CORS_ALLOW_HEADERS =
    'Content-Type, mcp-session-id, MCP-Session-Id, MCP-Protocol-Version, Accept, Authorization, X-API-Key, x-firecrawl-api-key, X-Context7-API-Key, Context7-API-Key';
/** 客户端需读取的响应头（会话 id 等），大小写两种写法以兼容不同客户端。 */
export const MCP_GATEWAY_CORS_EXPOSE_HEADERS = 'mcp-session-id, MCP-Session-Id';

// ---------------------------------------------------------------------------
// 文件与仓库
// ---------------------------------------------------------------------------

/**
 * 读取 JSON 文件并解析为泛型类型（调用方负责与文件内容一致）。
 * @param path - 绝对或相对路径（由调用方保证可读）。
 */
export const readJsonFile = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T;

/**
 * 向上查找带 `pnpm-workspace.yaml` 的 monorepo 根目录
 * @param startDir - 起始目录，一般为 `process.cwd()`
 */
export const findRepoRoot = (startDir: string) => {
    let current = resolve(startDir);
    for (let i = 0; i < 10; i++) {
        if (existsSync(resolve(current, 'pnpm-workspace.yaml'))) return current;
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return startDir;
};

// ---------------------------------------------------------------------------
// `.env` 加载（仅当 `process.env` 中对应键尚未定义时写入）
// ---------------------------------------------------------------------------

/**
 * 解析单行 `KEY=VALUE`，忽略注释与空行；支持可选双引号包裹值。
 * @param line - 原始行文本
 * @returns 解析出的键值或 `null`
 */
const parseEnvLine = (line: string): { key: string; value: string } | null => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return null;
    const eq = t.indexOf('=');
    if (eq <= 0) return null;
    const key = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
    }
    return { key, value };
};

/**
 * 将多行 `.env` 内容写入 `process.env`（仅当对应键尚未定义时）。
 * @param raw - 文件全文
 */
const applyDotenvContent = (raw: string) => {
    for (const line of raw.split(/\r?\n/)) {
        const parsed = parseEnvLine(line);
        if (!parsed) continue;
        if (process.env[parsed.key] === undefined) {
            process.env[parsed.key] = parsed.value;
        }
    }
};

/**
 * 依次读取 monorepo 根 `.env` 与 `packages/mcp-gateway/.env`，合并进当前进程环境。
 * 已存在于 `process.env` 的键（例如 shell 已 export）不会被覆盖。
 *
 * @param repoRoot - 含 `pnpm-workspace.yaml` 的仓库根目录
 */
export const loadOptionalEnvFiles = (repoRoot: string) => {
    const paths = [resolve(repoRoot, '.env'), resolve(repoRoot, 'packages', 'mcp-gateway', '.env')];
    for (const p of paths) {
        if (!existsSync(p)) continue;
        try {
            applyDotenvContent(readFileSync(p, 'utf8'));
        } catch (err) {
            console.warn(`[mcp-gateway] 无环境变量配置,skip reading env file ${p}:`, err);
        }
    }
};

// ---------------------------------------------------------------------------
// 配置路径解析
// ---------------------------------------------------------------------------

/**
 * 将配置文件中的路径解析为绝对路径：已是绝对路径则原样返回，否则相对 `baseDir` 拼接。
 * 用于外部服务 `spawn.cwd` 等字段，使 JSON 里可写相对 `mcp-gateway` 包目录的路径。
 *
 * @param baseDir - 解析相对路径时的基准目录（此处为网关包目录）。
 * @param maybeRelativePath - 配置中的路径字符串。
 */
export const resolveMaybeRelative = (baseDir: string, maybeRelativePath: string) => {
    if (isAbsolute(maybeRelativePath)) return maybeRelativePath;
    return resolve(baseDir, maybeRelativePath);
};

// ---------------------------------------------------------------------------
// TCP 端口就绪探测
// ---------------------------------------------------------------------------

export const isTcpPortOpen = async (host: string, port: number, timeoutMs = 500): Promise<boolean> => {
    return await new Promise<boolean>((resolve) => {
        const socket = createConnection({ host, port });
        let settled = false;

        const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            try {
                socket.destroy();
            } catch {
                // ignore
            }
            resolve(ok);
        };

        socket.setTimeout(timeoutMs);
        socket.once('connect', () => finish(true));
        socket.once('error', () => finish(false));
        socket.once('timeout', () => finish(false));
    });
};

export const waitForTcpReady = async (host: string, port: number, timeoutMs: number): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    const intervalMs = 200;

    while (true) {
        const ok = await isTcpPortOpen(host, port, 500);
        if (ok) return;
        if (Date.now() > deadline) {
            throw new Error(`External service not ready: ${host}:${port}`);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
};

// ---------------------------------------------------------------------------
// HTTP 反代（上游 URL、转发请求头）
// ---------------------------------------------------------------------------

/**
 * 根据上游根地址、路径与客户端 URL 的 query，拼出发往上游的绝对 URL（用于反向代理）。
 * @param upstreamBaseUrl - 上游根，如 `http://127.0.0.1:8950`
 * @param upstreamPath - 上游路径，如 `/mcp`（可无前导 `/`）
 * @param clientUrl - 客户端请求 URL（仅取其 `search` 拼到上游）
 */
export const buildReverseProxyTargetUrl = (upstreamBaseUrl: string, upstreamPath: string, clientUrl: URL): URL => {
    const path = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`;
    const target = new URL(path, upstreamBaseUrl);
    target.search = clientUrl.search;
    return target;
};

/**
 * 复制入站请求头，并设置 `Host` 与 `X-Forwarded-*`，供 `http.request` / `https.request` 转发到上游。
 * @param req - 入站请求
 * @param targetUrl - {@link buildReverseProxyTargetUrl} 的返回值
 */
export const buildReverseProxyForwardHeaders = (req: IncomingMessage, targetUrl: URL): Record<string, string> => {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        headers[key] = Array.isArray(value) ? value[0] : value;
    }
    headers.host = targetUrl.host;
    headers['x-forwarded-host'] = targetUrl.host;
    headers['x-forwarded-port'] = targetUrl.port;
    headers['x-forwarded-proto'] = targetUrl.protocol.replace(':', '');
    return headers;
};

// ---------------------------------------------------------------------------
// HTTP 请求体
// ---------------------------------------------------------------------------

/**
 * 读取并解析 JSON body；超限则 `destroy` 请求并 reject
 */
export const readJsonBody = async (req: IncomingMessage) => {
    return await new Promise<any>((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                req.destroy();
                reject(new Error(`Request body exceeds maximum size of ${MAX_BODY_BYTES} bytes`));
                return;
            }
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : null);
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
};

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/**
 * 从环境变量解析允许携带凭据的 Origin 白名单（逗号分隔，须与浏览器 `Origin` 头完全一致）。
 */
const parseCorsAllowedOriginsFromEnv = (): string[] => {
    const raw = process.env.MCP_GATEWAY_CORS_ALLOWED_ORIGINS?.trim();
    if (!raw) return [];
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
};

/**
 * 是否启用「凭据模式」CORS：`MCP_GATEWAY_CORS_ALLOW_CREDENTIALS=1|true` 且配置了
 * `MCP_GATEWAY_CORS_ALLOWED_ORIGINS`。此时仅当请求的 `Origin` 在白名单内才回显该 Origin 并设置
 * `Access-Control-Allow-Credentials: true`（规范要求不能用 `*`）。用于浏览器内页面同域/受控
 * 跨域调试时携带 Cookie；**Cursor 等桌面 MCP 客户端通常不走浏览器 Cookie 罐**，仍须依赖 Bearer 或入口注入。
 *
 * @param req - 可选；无则退化为 `Access-Control-Allow-Origin: *`
 * @returns 解析结果供写响应头使用
 */
export const resolveCredentialAwareCors = (req?: IncomingMessage) => {
    const allowCredentialsEnv = process.env.MCP_GATEWAY_CORS_ALLOW_CREDENTIALS?.trim()?.toLowerCase();
    const credentialsEnabled = allowCredentialsEnv === '1' || allowCredentialsEnv === 'true';
    const allowedOrigins = parseCorsAllowedOriginsFromEnv();
    const originHeader = req?.headers.origin;
    const requestOrigin = (Array.isArray(originHeader) ? originHeader[0] : originHeader) ?? '';
    const useCredentials = credentialsEnabled && allowedOrigins.length > 0 && Boolean(requestOrigin) && allowedOrigins.includes(requestOrigin);
    const allowHeaders = useCredentials ? `${MCP_GATEWAY_CORS_ALLOW_HEADERS}, Cookie` : MCP_GATEWAY_CORS_ALLOW_HEADERS;
    return { useCredentials, requestOrigin, allowHeaders };
};

/**
 * 设置 CORS 头；`includeMaxAge` 用于 OPTIONS 预检缓存。
 *
 * @param req - 传入时可按 `MCP_GATEWAY_CORS_*` 启用凭据模式（见 {@link resolveCredentialAwareCors}）
 */
export const setCorsHeaders = (res: ServerResponse, includeMaxAge = false, req?: IncomingMessage) => {
    const { useCredentials, requestOrigin, allowHeaders } = resolveCredentialAwareCors(req);
    if (useCredentials) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', allowHeaders);
    res.setHeader('Access-Control-Expose-Headers', MCP_GATEWAY_CORS_EXPOSE_HEADERS);
    if (includeMaxAge) res.setHeader('Access-Control-Max-Age', '86400');
};

// ---------------------------------------------------------------------------
// HTTP / JSON-RPC / OAuth 风格错误响应
// ---------------------------------------------------------------------------

/**
 * 发送 JSON-RPC 2.0 错误响应
 */
export const sendJsonRpcError = (res: ServerResponse, status: number, code: number, message: string) => {
    if (res.headersSent) return;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(
        JSON.stringify({
            jsonrpc: '2.0',
            error: { code, message },
            id: null,
        })
    );
};

/**
 * OAuth 2.0（RFC 6749）风格的 JSON 错误体。
 * 部分 MCP 客户端在 OAuth 流程中会按 JSON 解析错误响应；网关对未匹配路由若返回纯文本「Not Found」会触发 SyntaxError。
 *
 * @param res - HTTP 响应
 * @param status - HTTP 状态码
 * @param error - `error` 字段（如 `invalid_request`）
 * @param error_description - 人类可读说明
 */
export const sendOAuthStyleError = (res: ServerResponse, status: number, error: string, error_description: string) => {
    if (res.headersSent) return;
    try {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error, error_description }));
    } catch {
        try {
            if (!res.headersSent) {
                res.writeHead(status).end();
            }
        } catch {
            /** 响应已不可写时忽略 */
        }
    }
};

// ---------------------------------------------------------------------------
// MCP 网关路由（对外路径 ↔ 传输层内部路径）
// ---------------------------------------------------------------------------

/**
 * 将 `req.url` 临时改为传输层内部路径（如 `/mcp`）再执行 handler
 */
export const withInternalPath = async (req: IncomingMessage, internalPath: string, handler: () => Promise<void>) => {
    const originalUrl = req.url;
    req.url = internalPath;
    try {
        await handler();
    } finally {
        req.url = originalUrl;
    }
};

/**
 * 解析 `/fe/{serviceId}/mcp`。
 * @param pathname - 请求路径（不含 query）
 * @returns 含 `serviceId`；无法识别时为 `null`
 */
export const parseServicePath = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 3 && parts[0] === 'fe' && parts[2] === 'mcp') {
        return { serviceId: parts[1] };
    }
    return null;
};
