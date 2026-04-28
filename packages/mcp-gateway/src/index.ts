import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { loadServices } from './serviceRegistry.js'

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '127.0.0.1'

const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 4 * 1024 * 1024)

const readJsonBody = async (req: import('node:http').IncomingMessage) => {
    return await new Promise<any>((resolve, reject) => {
        let body = ''
        let size = 0
        req.on('data', (chunk) => {
            size += chunk.length
            if (size > MAX_BODY_BYTES) {
                req.destroy()
                reject(new Error(`Request body exceeds maximum size of ${MAX_BODY_BYTES} bytes`))
                return
            }
            body += chunk.toString()
        })
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : null)
            } catch (e) {
                reject(e)
            }
        })
        req.on('error', reject)
    })
}

const setCorsHeaders = (res: import('node:http').ServerResponse, includeMaxAge = false) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Accept, Authorization, X-API-Key')
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
    if (includeMaxAge) res.setHeader('Access-Control-Max-Age', '86400')
}

const sendJsonRpcError = (
    res: import('node:http').ServerResponse,
    status: number,
    code: number,
    message: string
) => {
    if (res.headersSent) return
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(
        JSON.stringify({
            jsonrpc: '2.0',
            error: { code, message },
            id: null
        })
    )
}

const parseServicePath = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    if (parts[1] !== 'mcp') return null
    return { serviceId: parts[0] }
}

const findRepoRoot = (startDir: string) => {
    let current = resolve(startDir)
    for (let i = 0; i < 10; i++) {
        if (existsSync(resolve(current, 'pnpm-workspace.yaml'))) return current
        const parent = dirname(current)
        if (parent === current) break
        current = parent
    }
    return startDir
}

const repoRoot = findRepoRoot(process.cwd())
const services = await loadServices(repoRoot)

const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

        if (req.method === 'OPTIONS') {
            setCorsHeaders(res, true)
            res.writeHead(204).end()
            return
        }

        setCorsHeaders(res)

        if (req.method === 'GET' && url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, services: Array.from(services.keys()) }))
            return
        }

        const route = parseServicePath(url.pathname)
        if (!route) {
            res.writeHead(404).end('Not Found')
            return
        }

        const service = services.get(route.serviceId)
        if (!service) {
            res.writeHead(404).end('Service Not Found')
            return
        }

        const sessionIdHeader = req.headers['mcp-session-id']
        const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader

        const body = req.method === 'POST' ? await readJsonBody(req) : null
        const isInit = !sessionId && body && isInitializeRequest(body)
        const isReInit = Boolean(sessionId && !service.sessions.has(sessionId) && body && isInitializeRequest(body))

        if (sessionId && service.sessions.has(sessionId)) {
            const { transport } = service.sessions.get(sessionId)!
            await transport.handleRequest(req, res, body)
            return
        }

        if (isInit || isReInit) {
            let transport: StreamableHTTPServerTransport
            const sdkServer = (service.server as any).createSDKServerForSession()
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sid) => {
                    service.sessions.set(sid, { transport, sdkServer })
                },
                enableJsonResponse: false
            })
            await sdkServer.connect(transport)

            transport.onclose = async () => {
                if (transport.sessionId) {
                    service.sessions.delete(transport.sessionId)
                }
                try {
                    await sdkServer.close()
                } catch {
                    // ignore
                }
            }

            transport.onerror = () => {
                // keep session, same behavior as mcp-framework
            }

            transport.onmessage = async () => {
                // handled via sdkServer.connect(transport)
            }

            await transport.handleRequest(req, res, body)
            return
        }

        if (!sessionId) {
            sendJsonRpcError(res, 400, -32000, 'Bad Request: No valid session ID provided')
            return
        }

        sendJsonRpcError(res, 404, -32001, 'Session not found')
    } catch (e: any) {
        if (!res.headersSent) res.writeHead(500).end('Internal Server Error')
    }
})

server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`MCP Gateway listening on ${host}:${port} (routes: /<service>/mcp)`)
})
