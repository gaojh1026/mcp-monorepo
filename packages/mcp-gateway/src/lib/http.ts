/**
 * @fileoverview HTTP 辅助：JSON body、CORS、JSON-RPC 错误、网关路径适配
 * @module mcp-gateway/lib/http
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { MAX_BODY_BYTES } from './runtime.js'

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
        'Content-Type, mcp-session-id, Accept, Authorization, X-API-Key'
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
 * 解析 `/{serviceId}/mcp` 形式路径
 */
export const parseServicePath = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    if (parts[1] !== 'mcp') return null
    return { serviceId: parts[0] }
}
