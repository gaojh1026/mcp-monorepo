/**
 * @fileoverview 网关通用辅助：读 JSON 文件、路径拼接、TCP 就绪、HTTP body/CORS/JSON-RPC/路由解析。
 * @module mcp-gateway/utils/helpers
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createConnection } from 'node:net'
import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { MAX_BODY_BYTES } from './env.js'

/**
 * 读取 JSON 文件并解析为泛型类型（调用方负责与文件内容一致）。
 * @param path - 绝对或相对路径（由调用方保证可读）。
 */
export const readJsonFile = async <T>(path: string): Promise<T> =>
    JSON.parse(await readFile(path, 'utf8')) as T

/**
 * 将配置文件中的路径解析为绝对路径：已是绝对路径则原样返回，否则相对 `baseDir` 拼接。
 * 用于外部服务 `spawn.cwd` 等字段，使 JSON 里可写相对 `mcp-gateway` 包目录的路径。
 *
 * @param baseDir - 解析相对路径时的基准目录（此处为网关包目录）。
 * @param maybeRelativePath - 配置中的路径字符串。
 */
export const resolveMaybeRelative = (
    baseDir: string,
    maybeRelativePath: string
) => {
    if (isAbsolute(maybeRelativePath)) return maybeRelativePath
    return resolve(baseDir, maybeRelativePath)
}

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
 * 读取并解析 JSON body；超限则 `destroy` 请求并 reject
 */
export const readJsonBody = async (req: IncomingMessage) => {
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
 * 设置 CORS 头；`includeMaxAge` 用于 OPTIONS 预检缓存
 */
export const setCorsHeaders = (res: ServerResponse, includeMaxAge = false) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, mcp-session-id, Accept, Authorization, X-API-Key, x-firecrawl-api-key'
    )
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
    if (includeMaxAge) res.setHeader('Access-Control-Max-Age', '86400')
}

/**
 * 发送 JSON-RPC 2.0 错误响应
 */
export const sendJsonRpcError = (
    res: ServerResponse,
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
 * 将 `req.url` 临时改为传输层内部路径（如 `/mcp`）再执行 handler
 */
export const withInternalPath = async (
    req: IncomingMessage,
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
 * @description 解析 `/{serviceId}/mcp` 形式路径
 * @param pathname - 路径
 * @returns {serviceId: string} - 服务 ID
 */
export const parseServicePath = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    if (parts[1] !== 'mcp') return null
    return { serviceId: parts[0] }
}
