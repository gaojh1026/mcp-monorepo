/**
 * @fileoverview MCP Gateway - 统一网关入口
 * 自动发现并路由所有 MCP 服务到 /<service>/mcp 路径
 * @module mcp-gateway
 */

import { createServer, request as httpRequest } from 'node:http'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, resolve } from 'node:path'
import { request as httpsRequest } from 'node:https'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { loadServices, type ExternalMcpService, type McpService } from './serviceRegistry.js'

/**
 * HTTP 服务器端口，默认为 8787
 * 可通过环境变量 PORT 覆盖
 */
const port = Number(process.env.PORT ?? 8787)

/**
 * HTTP 服务器监听地址
 * 默认为 127.0.0.1（仅本地访问），生产环境建议设为 0.0.0.0
 */
const host = process.env.HOST ?? '127.0.0.1'

/**
 * 请求体最大字节数，默认为 4MB
 * 防止恶意大请求耗尽服务器资源
 */
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 4 * 1024 * 1024)

/**
 * 从 HTTP 请求中读取并解析 JSON body
 * @param req - HTTP 请求对象
 * @returns 解析后的 JSON 对象
 * @throws 超过最大字节限制时销毁连接
 */
const readJsonBody = async (req: import('node:http').IncomingMessage) => {
    return await new Promise<any>((resolve, reject) => {
        let body = ''
        let size = 0
        req.on('data', chunk => {
            size += chunk.length
            if (size > MAX_BODY_BYTES) {
                req.destroy()
                reject(
                    new Error(
                        `Request body exceeds maximum size of ${MAX_BODY_BYTES} bytes`
                    )
                )
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

/**
 * 设置 CORS 响应头，支持跨域请求
 * @param res - HTTP 响应对象
 * @param includeMaxAge - 是否包含 Access-Control-Max-Age 头（预检请求缓存时间，默认不包含）
 */
const setCorsHeaders = (
    res: import('node:http').ServerResponse,
    includeMaxAge = false
) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, mcp-session-id, Accept, Authorization, X-API-Key'
    )
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
    if (includeMaxAge) res.setHeader('Access-Control-Max-Age', '86400')
}

/**
 * 发送 JSON-RPC 错误响应
 * @param res - HTTP 响应对象
 * @param status - HTTP 状态码
 * @param code - JSON-RPC 错误码（负数）
 * @param message - 错误消息
 */
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

/**
 * 将网关路由路径标准化为 SDK 传输层默认端点 `/mcp`
 * 外部请求路径是 `/{serviceId}/mcp`，但 StreamableHTTPServerTransport
 * 在内部通常按 `/mcp` 处理，因此这里临时改写 req.url 再转发。
 * @param req - HTTP 请求对象
 * @param internalPath - 传输层内部路径
 * @param handler - 实际处理函数
 */
const withInternalPath = async (
    req: import('node:http').IncomingMessage,
    internalPath: string,
    handler: () => Promise<void>
) => {
    const originalUrl = req.url
    req.url = internalPath
    try {
        await handler()
    } finally {
        req.url = originalUrl
    }
}

/**
 * 解析 URL 路径提取服务 ID
 * 期望格式: /{serviceId}/mcp
 * @param pathname - URL 路径名
 * @returns 包含 serviceId 的对象，或 null（路径格式不匹配）
 * @example
 * parseServicePath('/fetch/mcp') // => { serviceId: 'fetch' }
 * parseServicePath('/poem/mcp')  // => { serviceId: 'poem' }
 */
const parseServicePath = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    if (parts[1] !== 'mcp') return null
    return { serviceId: parts[0] }
}

/**
 * 向上遍历目录查找 monorepo 根目录
 * 通过 pnpm-workspace.yaml 文件标识
 * @param startDir - 起始目录（通常为 process.cwd()）
 * @returns 找到的根目录路径，或返回起始目录
 */
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

/**
 * 快速探测 TCP 端口是否可连（不重试），用于判断是否已存在外部进程。
 * @param host - 目标主机
 * @param port - 目标端口
 * @param timeoutMs - 探测超时时间
 */
const isTcpPortOpen = async (
    host: string,
    port: number,
    timeoutMs = 500
): Promise<boolean> => {
    return await new Promise<boolean>(resolve => {
        const socket = createConnection({ host, port })
        let settled = false

        const finish = (ok: boolean) => {
            if (settled) return
            settled = true
            try {
                socket.destroy()
            } catch {
                // ignore
            }
            resolve(ok)
        }

        socket.setTimeout(timeoutMs)
        socket.once('connect', () => finish(true))
        socket.once('error', () => finish(false))
        socket.once('timeout', () => finish(false))
    })
}

/**
 * 等待 TCP 端口可连就绪（重试直到 timeoutMs）。
 * @param host - 目标主机
 * @param port - 目标端口
 * @param timeoutMs - 最大等待时间
 */
const waitForTcpReady = async (
    host: string,
    port: number,
    timeoutMs: number
): Promise<void> => {
    const deadline = Date.now() + timeoutMs
    const intervalMs = 200

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const ok = await isTcpPortOpen(host, port, 500)
        if (ok) return
        if (Date.now() > deadline) {
            throw new Error(`External service not ready: ${host}:${port}`)
        }
        await new Promise(r => setTimeout(r, intervalMs))
    }
}

/**
 * 对 external MCP 服务启动对应进程并等待其 ready。
 * @param service - 外部服务定义
 */
const ensureExternalServicesStarted = async (
    services: Map<string, McpService>
) => {
    const externalServices = Array.from(services.values()).filter(
        (s): s is ExternalMcpService => s.type === 'external'
    )

    const started = await Promise.all(
        externalServices.map(async service => {
            // 若端口本来就可连，则跳过 spawn，避免重复启动冲突
            const portOpen = await isTcpPortOpen(
                service.ready.host,
                service.ready.port,
                300
            )
            if (!portOpen) {
                const env = { ...process.env, ...(service.spawn.env ?? {}) }
                const child = spawn(service.spawn.command, service.spawn.args, {
                    cwd: service.spawn.cwd,
                    env,
                    shell: service.spawn.shell ?? false,
                    stdio: 'inherit'
                })

                service.process = child

                child.once('exit', (code, signal) => {
                    // eslint-disable-next-line no-console
                    console.warn(
                        `[mcp-gateway] external service '${service.id}' exited (code=${code}, signal=${signal})`
                    )
                })
            }

            await waitForTcpReady(
                service.ready.host,
                service.ready.port,
                service.ready.timeoutMs
            )
        })
    )

    void started
}

/**
 * 反向代理 external 服务请求（包含 SSE 的流式响应透传）。
 * @param req - HTTP 请求
 * @param res - HTTP 响应
 * @param service - external 服务
 * @param url - 网关侧解析后的 URL
 */
const proxyExternalRequest = async (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    service: ExternalMcpService,
    url: URL
) => {
    const upstreamPath = service.upstream.path.startsWith('/')
        ? service.upstream.path
        : `/${service.upstream.path}`
    const targetUrl = new URL(upstreamPath, service.upstream.baseUrl)
    targetUrl.search = url.search

    const proxyHeaders: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue
        proxyHeaders[k] = Array.isArray(v) ? v[0] : v
    }
    proxyHeaders.host = targetUrl.host
    // 与上游一致，避免 upstream 做额外的 DNS rebinding/host 校验时依赖 forwarded 头
    proxyHeaders['x-forwarded-host'] = targetUrl.host
    proxyHeaders['x-forwarded-port'] = targetUrl.port
    proxyHeaders['x-forwarded-proto'] = targetUrl.protocol.replace(':', '')

    const isHttps = targetUrl.protocol === 'https:'
    const requester = isHttps ? httpsRequest : httpRequest

    await new Promise<void>((resolve, reject) => {
        const proxyReq = requester(
            {
                method: req.method,
                protocol: targetUrl.protocol,
                hostname: targetUrl.hostname,
                port: targetUrl.port,
                path: targetUrl.pathname + targetUrl.search,
                headers: proxyHeaders
            },
            proxyRes => {
                const corsHeaders: Record<string, string> = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods':
                        'GET, POST, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers':
                        'Content-Type, mcp-session-id, Accept, Authorization, X-API-Key',
                    'Access-Control-Expose-Headers': 'mcp-session-id'
                }

                if (!res.headersSent) {
                    res.writeHead(
                        proxyRes.statusCode ?? 502,
                        Object.assign({}, proxyRes.headers as any, corsHeaders)
                    )
                }
                proxyRes.pipe(res)

                proxyRes.on('end', () => resolve())
            }
        )

        proxyReq.on('error', err => reject(err))
        req.on('aborted', () => proxyReq.destroy())

        req.pipe(proxyReq)
    }).catch(err => {
        if (res.headersSent) return
        res.writeHead(502).end(`Bad Gateway: ${(err as Error).message}`)
    })
}

/**
 * 网关路由表：serviceId -> McpService
 * 在模块加载时初始化，自动发现所有 mcp-* 服务
 */
const repoRoot = findRepoRoot(process.cwd())
const services = await loadServices(repoRoot)
await ensureExternalServicesStarted(services)

/**
 * MCP 网关 HTTP 服务器
 * 路由规则：
 * - GET  /health           - 健康检查，返回所有已注册服务列表
 * - OPTIONS /*             - CORS 预检请求
 * - GET|POST /{service}/mcp - MCP 协议端点，按 service 路由
 */
const server = createServer(async (req, res) => {
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
            const sdkServer = (
                service.server as any
            ).createSDKServerForSession()
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: sid => {
                    service.sessions.set(sid, { transport, sdkServer })
                },
                // 允许初始化阶段返回 JSON，避免部分客户端在 SSE 首包阶段超时
                enableJsonResponse: true
            })
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
    } catch (e: any) {
        if (!res.headersSent) res.writeHead(500).end('Internal Server Error')
    }
})

/**
 * 启动 MCP 网关服务器
 * 监听地址: host:port
 * 可通过 MCP_GATEWAY_DEV=1 环境变量启用开发模式
 */
server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(
        `MCP Gateway listening on ${host}:${port} (routes: /<service>/mcp)`
    )
})
