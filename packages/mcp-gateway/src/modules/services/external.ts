/**
 * @fileoverview 外部 MCP：TCP 就绪、可选 spawn、HTTP(S) 反代
 * @module mcp-gateway/modules/services/external
 */

import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ExternalMcpService, McpService } from './registry.js'

export const isTcpPortOpen = async (
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

export const waitForTcpReady = async (
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
 * 为所有 `external` 服务 spawn（若端口未开）并等待 TCP ready
 */
export const ensureExternalServicesStarted = async (
    services: Map<string, McpService>
) => {
    const externalServices = Array.from(services.values()).filter(
        (s): s is ExternalMcpService => s.type === 'external'
    )

    const started = await Promise.all(
        externalServices.map(async service => {
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
 * 将请求反代到外部服务 upstream（含流式响应）
 */
export const proxyExternalRequest = async (
    req: IncomingMessage,
    res: ServerResponse,
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
