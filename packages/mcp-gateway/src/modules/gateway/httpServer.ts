/**
 * @fileoverview 网关 HTTP 入口：Node `http.Server` 上的路由、CORS、本地 Streamable MCP 会话与外部代理。
 *
 * 路由约定：
 * - `OPTIONS *`：CORS 预检
 * - `GET /health`：JSON 探活，含已注册服务 ID
 * - `GET /services`：服务列表 HTML 面板
 * - `GET|POST|DELETE /{serviceId}/mcp`：MCP 端点；SDK 内部路径通过 {@link withInternalPath} 映射为 `/mcp`
 *
 * 本地服务：依据 `mcp-session-id` 与是否 `initialize` 请求，在 `service.sessions` 中复用或新建
 * `StreamableHTTPServerTransport` 与会话级 `sdkServer`。
 *
 * @module mcp-gateway/modules/gateway/httpServer
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { McpService } from '../services/registry.js'
import {
    readJsonBody,
    setCorsHeaders,
    sendJsonRpcError,
    withInternalPath,
    parseServicePath
} from '../../lib/http.js'
import { SERVICES_PANEL_HTML } from '../services/panelHtml.js'
// 外部服务
import { proxyExternalRequest } from '../services/external.js'

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

            /** CORS 预检：仅写头并 204 */
            if (req.method === 'OPTIONS') {
                setCorsHeaders(res, true)
                res.writeHead(204).end()
                return
            }

            setCorsHeaders(res)

            /** 探活：返回 ok 与当前注册的服务键 */
            if (req.method === 'GET' && url.pathname === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(
                    JSON.stringify({
                        ok: true,
                        msg: 'hello mcp',
                        services: Array.from(services.keys())
                    })
                )
                return
            }

            /** 人类可读的服务列表页 */
            if (req.method === 'GET' && url.pathname === '/services') {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8'
                })
                res.end(SERVICES_PANEL_HTML)
                return
            }

            /** 仅识别 `/{serviceId}/mcp` */
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

            /** 外部 MCP：转发，不维护网关侧 session Map */
            if (service.type === 'external') {
                await proxyExternalRequest(req, res, service, url)
                return
            }

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
                const sdkServer = (
                    service.server as any
                ).createSDKServerForSession()
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
        } catch {
            if (!res.headersSent)
                res.writeHead(500).end('Internal Server Error')
        }
    })
}
