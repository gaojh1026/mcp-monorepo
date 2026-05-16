/**
 * @fileoverview 网关 HTTP：Node `http.Server` 上的路由、CORS、本地 Streamable MCP 会话与外部代理。
 *
 * 路由约定：
 * - `OPTIONS *`：CORS 预检
 * - `GET /health`：JSON 探活，含已注册服务 ID
 * - `GET /health2`：轻量探活，JSON `{"status":"UP"|"DOWN"}`（与未启用 Spring Actuator 时的自建探活约定一致；若后端已配置 Actuator 可改用 `/actuator/health`）
 * - `GET /`：服务列表 HTML 面板（`app-front-mcp/dist/index.html`）
 * - `GET|POST|DELETE /fe/{serviceId}/mcp`：MCP 端点；SDK 内部路径通过 {@link withInternalPath} 映射为 `/mcp`
 * 本地服务：依据 `mcp-session-id` 与是否 `initialize` 请求，在 `service.sessions` 中复用或新建
 * `StreamableHTTPServerTransport` 与会话级 `sdkServer`；在交给 transport 前经 {@link AuthProvider} 将请求头写入
 * `runInRequestContext`（当前要求 `Authorization: Bearer <token>` 且校验 token 外形，不校验签名；可由 Nginx/上游收紧）。
 * @module mcp-gateway/mcp/httpGateway
 */

import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { runInRequestContext } from 'mcp-framework';
import { AuthProvider } from './authProvider.js';
import { proxyExternalRequest } from './services.js';
import type { ExternalMcpService, LocalMcpService, McpService } from '../type.js';
import { parseServicePath, readJsonBody, sendJsonRpcError, sendOAuthStyleError, setCorsHeaders, withInternalPath } from '../utils/utils.js';

// ================================================================================ 模块一：处理各种接口路径 ================================================================================

/** ------------------------------------------------------------ 路径一：根路径 '/' ------------------------------------------------------------ */

/** `app-front-mcp` 单文件构建产物路径（`dist/index.html`）。 */
const servicesPanelIndexPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'app-front-mcp', 'dist', 'index.html');
/** 内存缓存；加载失败则不再重试直至进程重启 */
let servicesPanelHtmlCache: string | undefined;
/** 加载失败标志；加载失败则不再重试直至进程重启 */
let servicesPanelLoadFailed = false;

/**
 * 读取并缓存服务面板 HTML。
 * @returns 成功为 HTML 字符串；缺失或读盘失败为 `null`
 */
const loadServicesPanelHtml = (): string | null => {
    if (servicesPanelHtmlCache !== undefined) return servicesPanelHtmlCache;
    if (servicesPanelLoadFailed) return null;

    try {
        if (!existsSync(servicesPanelIndexPath)) {
            servicesPanelLoadFailed = true;
            return null;
        }
        servicesPanelHtmlCache = readFileSync(servicesPanelIndexPath, 'utf-8');
        return servicesPanelHtmlCache;
    } catch {
        servicesPanelLoadFailed = true;
        return null;
    }
};

/**
 * @description 路径一：‘/’
 *  `GET /`：返回 `app-front-mcp` 构建后的单文件管理面板。
 * @returns 已处理则 `true`
 */
const handleRootRoute = (req: IncomingMessage, res: ServerResponse, url: URL) => {
    if (req.method !== 'GET' || url.pathname !== '/') return false;

    const html = loadServicesPanelHtml();
    if (html === null) {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('服务面板未就绪：请先执行 pnpm -C packages/app-front-mcp build 生成 dist/index.html，并重启网关。');
        return true;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return true;
};

/** ------------------------------------------------------------ 路径二：服务健康路径 '/health' ------------------------------------------------------------ */

/**
 * @description 路径二：‘/health’
 * `GET /health`：JSON 探活，返回完整服务列表信息。
 * @returns 已处理则 `true`
 */
const handleHealth = (req: IncomingMessage, res: ServerResponse, url: URL, services: Map<string, McpService>) => {
    if (req.method !== 'GET' || url.pathname !== '/health') return false;

    const servicesInfo = Array.from(services.values()).map((service) => {
        if (service.type === 'local') {
            return {
                id: service.id,
                type: 'local',
                basePath: service.basePath,
            };
        }
        return {
            id: service.id,
            type: 'external',
            upstream: service.upstream,
            spawn: {
                command: service.spawn.command,
                args: service.spawn.args,
            },
        };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
        JSON.stringify({
            ok: true,
            msg: 'hello mcp-gateway网关',
            services: servicesInfo,
        })
    );
    return true;
};

/** ------------------------------------------------------------ 路径三：轻量健康路径 '/health2' ------------------------------------------------------------ */

/**
 * @description 路径三：‘/health2’
 * `GET /health2`：轻量探活，仅返回状态字段
 * @returns 已处理则 `true`
 */
const handleHealth2 = (req: IncomingMessage, res: ServerResponse, url: URL) => {
    if (req.method !== 'GET' || url.pathname !== '/health2') return false;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'UP' }));
    return true;
};

// ================================================================================ 模块二：处理各种请求 ================================================================================

/**
 * @description 请求一：CORS 预检
 * CORS 预检：写头并 204。
 * @returns 已处理则 `true`，调用方应结束本次请求
 */
const handleOptionsPreflight = (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'OPTIONS') return false;
    setCorsHeaders(res, true, req);
    res.writeHead(204).end();
    return true;
};

/**
 * @description 请求二：MCP 服务路由
 * `/fe/{serviceId}/mcp`：解析路由、404、按 local / external 分发。
 */
const handleMcpServiceRoute = async (req: IncomingMessage, res: ServerResponse, url: URL, services: Map<string, McpService>) => {
    const route = parseServicePath(url.pathname);
    if (!route) {
        sendOAuthStyleError(res, 404, 'invalid_request', 'Request path does not match /fe/{serviceId}/mcp; this host returns RFC 6749-style JSON errors for OAuth clients.');
        return;
    }
    /** 保留 query */
    const internalPath = `/mcp${url.search}`;

    const service = services.get(route.serviceId);
    if (!service) {
        sendOAuthStyleError(res, 404, 'invalid_request', `No MCP service registered for serviceId "${route.serviceId}".`);
        return;
    }

    /** 处理外部 MCP 服务路由 */
    if (service.type === 'external') {
        await handleExternalMcpRoute(req, res, url, service);
        return;
    }

    /** 处理本地 MCP 服务路由 */
    await handleLocalStreamableMcp(req, res, service, internalPath);
};

// ------------------------------------------------------------ 处理外部服务&内部服务 ------------------------------------------------------------

/**
 * @description 服务一：处理外部 MCP：整段请求反代到子进程 upstream。
 */
const handleExternalMcpRoute = async (req: IncomingMessage, res: ServerResponse, url: URL, service: ExternalMcpService) => {
    await proxyExternalRequest(req, res, service, url);
};

/** 本地 MCP 共用的入口 {@link AuthProvider}（Bearer + token 外形校验，透传请求头） */
const autoProvider = new AuthProvider();

/**
 * 在调用 SDK transport 前经 {@link AuthProvider} 准备请求上下文并 `runInRequestContext`（Bearer + token 外形校验后透传请求头与 token）。
 * 鉴权在**未**改写 `req.url` 时执行，便于日志与策略使用对外路径；`inner` 内须自行 {@link withInternalPath} 后再调用 transport。
 *
 * @param req - Node 入站请求
 * @param res - 当 `authenticate` 返回 `false` 时写回 JSON-RPC 错误
 * @param inner - 鉴权通过后在 `runInRequestContext` 中执行（本地 MCP 应在内层 `withInternalPath` 后再 `handleRequest`）
 * @returns `authenticate` 失败并已写响应时为 `false`，否则为 `true`（`inner` 已执行）
 */
const runLocalMcpIngressAuthThen = async (req: IncomingMessage, res: ServerResponse, inner: () => Promise<void>): Promise<boolean> => {
    const authResult = await autoProvider.authenticate(req);
    if (!authResult) {
        const err = autoProvider.getAuthError?.() ?? { status: 401, message: 'Unauthorized' };
        sendJsonRpcError(res, err.status, -32002, err.message);
        return false;
    }
    const store = typeof authResult === 'boolean' ? {} : { ...(authResult.data ?? {}) };
    await runInRequestContext(store, inner);
    return true;
};

/**
 * 新建本地 Streamable MCP 会话：创建 transport / sdkServer，写入 `service.sessions`，并完成 SDK `connect`。
 *
 * @param service - 本地 MCP 服务
 * @returns 已连接、可 `handleRequest` 的 transport
 */
const connectNewLocalMcpStreamableSession = async (service: LocalMcpService): Promise<StreamableHTTPServerTransport> => {
    let transport: StreamableHTTPServerTransport;
    let isClosingSession = false;
    const sdkServer = (service.server as any).createSDKServerForSession();
    transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
            service.sessions.set(sid, { transport, sdkServer });
        },
        enableJsonResponse: true,
    });
    transport.onclose = async () => {
        if (isClosingSession) return;
        isClosingSession = true;
        if (transport.sessionId) {
            service.sessions.delete(transport.sessionId);
        }
        try {
            await sdkServer.close();
        } catch {
            /** 关闭失败不向外抛，避免 onclose 重复触发时干扰 */
        } finally {
            isClosingSession = false;
        }
    };
    await sdkServer.connect(transport);
    return transport;
};

/**
 * 本地 MCP：Streamable HTTP + 会话表（复用 / 新建 transport + sdkServer）。
 * 已存在 `mcp-session-id` 则复用；无 session 的 initialize 或 stale session 上的 initialize 则新建；否则按协议返回 400/404。
 */
const handleLocalStreamableMcp = async (req: IncomingMessage, res: ServerResponse, service: LocalMcpService, internalPath: string) => {
    const sessionIdHeader = req.headers['mcp-session-id'];
    const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
    const body = req.method === 'POST' ? await readJsonBody(req) : null;

    /** 先鉴权（`req.url` 仍为对外路径如 `/fe/.../mcp`），再在 `withInternalPath` 内交给 transport（SDK 仅见 `/mcp`） */
    const dispatchToTransport = async (transport: StreamableHTTPServerTransport) => {
        const ok = await runLocalMcpIngressAuthThen(req, res, async () => {
            await withInternalPath(req, internalPath, async () => {
                await transport.handleRequest(req, res, body);
            });
        });
        if (!ok) return;
    };

    /** 已存在会话：直接交给既有 transport */
    if (sessionId && service.sessions.has(sessionId)) {
        await dispatchToTransport(service.sessions.get(sessionId)!.transport);
        return;
    }

    /** 无 session 且 body 为 initialize → 新建会话 */
    const isInit = !sessionId && body && isInitializeRequest(body);
    /**
     * 客户端仍带旧/未知 session，但网关已无该会话，且再次 initialize → 按新会话建传输
     * （例如网关重启或会话已清理）
     */
    const isReInit = Boolean(sessionId && !service.sessions.has(sessionId) && body && isInitializeRequest(body));

    /** 新建或重建会话：会话级 SDK server + StreamableHTTP 传输 */
    if (isInit || isReInit) {
        await dispatchToTransport(await connectNewLocalMcpStreamableSession(service));
        return;
    }

    /** 非 initialize 且无 session → 协议层错误 */
    if (!sessionId) {
        sendJsonRpcError(res, 400, -32000, 'Bad Request: No valid session ID provided');
        return;
    }

    /** 带了 session id 但本地已无记录且非 re-init initialize */
    sendJsonRpcError(res, 404, -32001, 'Session not found');
};

// ================================================================================ 模块三：创建网关 HTTP 服务器 ================================================================================

/**
 * @description 创建网关 HTTP 服务器
 * @param services - 服务 ID → {@link McpService}，须与路径中的 `serviceId` 一致
 * @returns 已配置请求处理逻辑的 `http.Server`（调用方负责 `listen`）
 * @description 对 `type === 'local'` 的服务：首次或无有效 session 时的 `initialize` 会创建传输并写入
 * `service.sessions`；后续请求凭 `mcp-session-id` 命中同一 `transport`。传输关闭时从 Map 移除并关闭 `sdkServer`。
 * @description 对 `type === 'external'` 的服务：整段请求交给 {@link proxyExternalRequest}，不经由此处的会话表。
 */
export const createGatewayHttpServer = (services: Map<string, McpService>) => {
    return createServer(async (req, res) => {
        try {
            const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

            /** 处理 CORS 预检 */
            if (handleOptionsPreflight(req, res)) return;
            /** 设置 CORS 响应头 */
            setCorsHeaders(res, false, req);

            /** 处理健康检查 */
            if (handleHealth(req, res, url, services)) return;
            if (handleHealth2(req, res, url)) return;
            /** 处理服务面板 */
            if (handleRootRoute(req, res, url)) return;

            /** 处理 MCP 服务路由 */
            await handleMcpServiceRoute(req, res, url, services);
        } catch {
            if (!res.headersSent) res.writeHead(500).end('Internal Server Error');
        }
    });
};
