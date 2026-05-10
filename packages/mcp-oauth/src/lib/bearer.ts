/**
 * Bearer 鉴权与上游请求工具
 *
 * 提供：
 * - BearerIngressAuthProvider：入口鉴权，提取 Authorization: Bearer 并写入上下文
 * - getRequestAccessToken：从上下文获取 token
 * - fetchWithMcpRequestAuthorization：使用上下文 token 发起上游请求
 */

import type { IncomingMessage } from 'node:http'
import type { AuthProvider, AuthResult } from 'mcp-framework'
import { getRequestContext } from 'mcp-framework'

/**
 * 入口鉴权：要求 `Authorization: Bearer <token>`，不校验 token 真伪（由上游如 Nest 校验）。
 * 校验通过后把 `token` 写入请求上下文，供 `getRequestAccessToken` 使用。
 */
export class BearerIngressAuthProvider implements AuthProvider {
    async authenticate(req: IncomingMessage): Promise<AuthResult | false> {
        console.log('req---bearer', req)
        const raw = req.headers.authorization
        if (!raw || typeof raw !== 'string' || !raw.startsWith('Bearer ')) {
            return false
        }
        const token = raw.slice('Bearer '.length).trim()
        if (!token) {
            return false
        }
        return { data: { token } }
    }

    getAuthError(): { status: number; message: string } {
        return { status: 401, message: '需要 Authorization: Bearer <token>' }
    }
}

/**
 * 获取当前 MCP 请求上下文中的 Bearer access token
 */
export function getRequestAccessToken(): string | undefined {
    const ctx = getRequestContext()
    const token = ctx?.token
    return typeof token === 'string' && token.length > 0 ? token : undefined
}

/**
 * 使用 MCP 请求上下文的 Bearer token 发起 HTTP 请求
 */
export async function fetchWithMcpRequestAuthorization(
    input: Parameters<typeof fetch>[0],
    init?: RequestInit
): Promise<Response> {
    const token = getRequestAccessToken()
    if (!token) {
        throw new Error(
            '无 Bearer：请在 MCP 客户端连接本服务时配置 Authorization: Bearer <token>（与调 Nest 使用同一 token）。'
        )
    }
    const headers = new Headers(init?.headers ?? undefined)
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(input, { ...init, headers })
}
