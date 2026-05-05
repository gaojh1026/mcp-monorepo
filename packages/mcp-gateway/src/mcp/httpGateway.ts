/**
 * @fileoverview 网关 HTTP：Node `http.Server` 上的路由、CORS、本地 Streamable MCP 会话与外部代理。
 *
 * 路由约定：
 * - `OPTIONS *`：CORS 预检
 * - `GET /health`：JSON 探活，含已注册服务 ID
 * - `GET /services`：服务列表 HTML 面板
 * - `GET|POST|DELETE /{serviceId}/mcp`：MCP 端点；SDK 内部路径通过 {@link withInternalPath} 映射为 `/mcp`
 *
 * 本地服务：依据 `mcp-session-id` 与是否 `initialize` 请求，在 `service.sessions` 中复用或新建
 * `StreamableHTTPServerTransport` 与会话级 `sdkServer`。
 * @module mcp-gateway/mcp/httpGateway
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
    readJsonBody,
    setCorsHeaders,
    sendJsonRpcError,
    withInternalPath,
    parseServicePath
} from '../utils/helpers.js'
import {
    proxyExternalRequest,
    type McpService,
    type LocalMcpService,
    type ExternalMcpService
} from './services.js'
import { SERVICES_PANEL_HTML } from './panelHtml.js'

/**
 * CORS 预检：写头并 204。
 * @returns 已处理则 `true`，调用方应结束本次请求
 */
const handleOptionsPreflight = (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'OPTIONS') return false
    setCorsHeaders(res, true)
    res.writeHead(204).end()
    return true
}

/**
 * `GET /health`：JSON 探活。
 * @returns 已处理则 `true`
 */
const handleHealth = (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    services: Map<string, McpService>
) => {
    if (req.method !== 'GET' || url.pathname !== '/health') return false
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
        JSON.stringify({
            ok: true,
            msg: 'hello mcp',
            services: Array.from(services.keys())
        })
    )
    return true
}

/**
 * `GET /services`：内嵌管理面板 HTML。
 * @returns 已处理则 `true`
 */
const handleServicesPanel = (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL
) => {
    if (req.method !== 'GET' || url.pathname !== '/services') return false
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(SERVICES_PANEL_HTML)
    return true
}

/**
 * 外部 MCP：整段请求反代到子进程 upstream。
 */
const handleExternalMcpRoute = async (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    service: ExternalMcpService
) => {
    await proxyExternalRequest(req, res, service, url)
}

/**
 * 本地 MCP：Streamable HTTP + 会话表（复用 / 新建 transport + sdkServer）。
 */
const handleLocalStreamableMcp = async (
    req: IncomingMessage,
    res: ServerResponse,
    service: LocalMcpService,
    internalPath: string
) => {
    const sessionIdHeader = req.headers['mcp-session-id']
    const sessionId = Array.isArray(sessionIdHeader)
        ? sessionIdHeader[0]
        : sessionIdHeader

    const body = req.method === 'POST' ? await readJsonBody(req) : null
    /** 无 session 且 body 为 initialize → 新建会话 */
    const isInit = !sessionId && body && isInitializeRequest(body)
    /**
     * 客户端仍带旧/未知 session，但网关已无该会话，且再次 initialize → 按新会话建传输
     * （例如网关重启或会话已清理）
     */
    const isReInit = Boolean(
        sessionId &&
        !service.sessions.has(sessionId) &&
        body &&
        isInitializeRequest(body)
    )

    /** 已存在会话：直接交给既有 transport */
    if (sessionId && service.sessions.has(sessionId)) {
        const { transport } = service.sessions.get(sessionId)!
        await withInternalPath(req, internalPath, async () => {
            await transport.handleRequest(req, res, body)
        })
        return
    }

    /** 新建或重建会话：会话级 SDK server + StreamableHTTP 传输 */
    if (isInit || isReInit) {
        let transport: StreamableHTTPServerTransport
        let isClosingSession = false
        const sdkServer = (service.server as any).createSDKServerForSession()
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: sid => {
                service.sessions.set(sid, { transport, sdkServer })
            },
            enableJsonResponse: true
        })
        transport.onclose = async () => {
            if (isClosingSession) return
            isClosingSession = true
            if (transport.sessionId) {
                service.sessions.delete(transport.sessionId)
            }
            try {
                await sdkServer.close()
            } catch {
                /** 关闭失败不向外抛，避免 onclose 重复触发时干扰 */
            } finally {
                isClosingSession = false
            }
        }

        await sdkServer.connect(transport)

        await withInternalPath(req, internalPath, async () => {
            await transport.handleRequest(req, res, body)
        })
        return
    }

    /** 非 initialize 且无 session → 协议层错误 */
    if (!sessionId) {
        sendJsonRpcError(
            res,
            400,
            -32000,
            'Bad Request: No valid session ID provided'
        )
        return
    }

    /** 带了 session id 但本地已无记录且非 re-init initialize */
    sendJsonRpcError(res, 404, -32001, 'Session not found')
}

/**
 * `/{serviceId}/mcp`：解析路由、404、按 local / external 分发。
 */
const handleMcpServiceRoute = async (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    services: Map<string, McpService>
) => {
    const route = parseServicePath(url.pathname)
    if (!route) {
        res.writeHead(404).end('Not Found')
        return
    }
    /** 保留 query，供传输层与上游一致 */
    const internalPath = `/mcp${url.search}`

    const service = services.get(route.serviceId)
    if (!service) {
        res.writeHead(404).end('Service MCP Not Found')
        return
    }

    /** 处理外部 MCP 服务路由 */
    if (service.type === 'external') {
        await handleExternalMcpRoute(req, res, url, service)
        return
    }

    /** 处理本地 MCP 服务路由 */
    await handleLocalStreamableMcp(req, res, service, internalPath)
}

/**
 * 创建绑定 `services` 的网关 HTTP 服务器。
 *
 * 对 `type === 'local'` 的服务：首次或无有效 session 时的 `initialize` 会创建传输并写入
 * `service.sessions`；后续请求凭 `mcp-session-id` 命中同一 `transport`。传输关闭时从 Map 移除并关闭 `sdkServer`。
 *
 * 对 `type === 'external'` 的服务：整段请求交给 {@link proxyExternalRequest}，不经由此处的会话表。
 *
 * @param services - 服务 ID → {@link McpService}，须与路径中的 `serviceId` 一致
 * @returns 已配置请求处理逻辑的 `http.Server`（调用方负责 `listen`）
 */
export const createGatewayHttpServer = (services: Map<string, McpService>) => {
    return createServer(async (req, res) => {
        try {
            const url = new URL(
                req.url ?? '/',
                `http://${req.headers.host ?? 'localhost'}`
            )

            /** 处理 CORS 预检 */
            if (handleOptionsPreflight(req, res)) return
            /** 设置 CORS 响应头 */
            setCorsHeaders(res)
            /** 处理健康检查 */
            if (handleHealth(req, res, url, services)) return
            /** 处理服务面板 */
            if (handleServicesPanel(req, res, url)) return
            /** 处理 MCP 服务路由 */
            await handleMcpServiceRoute(req, res, url, services)
        } catch {
            if (!res.headersSent)
                res.writeHead(500).end('Internal Server Error')
        }
    })
}
