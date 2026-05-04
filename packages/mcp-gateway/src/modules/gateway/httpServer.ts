/**
 * @fileoverview 网关 HTTP：`/health`、`/services`、`/{id}/mcp` 路由与本地 MCP 会话
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
import { proxyExternalRequest } from '../services/external.js'

/**
 * 创建网关 `http.Server`，绑定已加载的 `services` Map
 */
export const createGatewayHttpServer = (services: Map<string, McpService>) => {
    return createServer(async (req, res) => {
        try {
            const url = new URL(
                req.url ?? '/',
                `http://${req.headers.host ?? 'localhost'}`
            )

            if (req.method === 'OPTIONS') {
                setCorsHeaders(res, true)
                res.writeHead(204).end()
                return
            }

            setCorsHeaders(res)

            if (req.method === 'GET' && url.pathname === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(
                    JSON.stringify({
                        ok: true,
                        services: Array.from(services.keys())
                    })
                )
                return
            }

            if (req.method === 'GET' && url.pathname === '/services') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
                res.end(SERVICES_PANEL_HTML)
                return
            }

            const route = parseServicePath(url.pathname)
            if (!route) {
                res.writeHead(404).end('Not Found')
                return
            }
            const internalPath = `/mcp${url.search}`

            const service = services.get(route.serviceId)
            if (!service) {
                res.writeHead(404).end('Service Not Found')
                return
            }

            if (service.type === 'external') {
                await proxyExternalRequest(req, res, service, url)
                return
            }

            const sessionIdHeader = req.headers['mcp-session-id']
            const sessionId = Array.isArray(sessionIdHeader)
                ? sessionIdHeader[0]
                : sessionIdHeader

            const body = req.method === 'POST' ? await readJsonBody(req) : null
            const isInit = !sessionId && body && isInitializeRequest(body)
            const isReInit = Boolean(
                sessionId &&
                !service.sessions.has(sessionId) &&
                body &&
                isInitializeRequest(body)
            )

            if (sessionId && service.sessions.has(sessionId)) {
                const { transport } = service.sessions.get(sessionId)!
                await withInternalPath(req, internalPath, async () => {
                    await transport.handleRequest(req, res, body)
                })
                return
            }

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
                        // ignore
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

            if (!sessionId) {
                sendJsonRpcError(
                    res,
                    400,
                    -32000,
                    'Bad Request: No valid session ID provided'
                )
                return
            }

            sendJsonRpcError(res, 404, -32001, 'Session not found')
        } catch {
            if (!res.headersSent) res.writeHead(500).end('Internal Server Error')
        }
    })
}
