/**
 * @fileoverview 入口 Bearer 鉴权：要求非空 `Authorization: Bearer`，并把 token 写入请求上下文。
 */

import type { IncomingMessage } from 'node:http'
import type { AuthProvider, AuthResult } from 'mcp-framework'

/**
 * 入口鉴权：要求 `Authorization: Bearer <token>`，不校验 token 真伪（由上游如 Nest 校验）。
 * 校验通过后把 `token` 写入请求上下文，供 `getRequestAccessToken`（`lib/upstream.ts`）使用。
 *
 * 生产环境若需在本服务校验 JWT，请改用框架的 `OAuthAuthProvider`（JWKS）等方案。
 */
export class BearerIngressAuthProvider implements AuthProvider {
    /**
     * 从请求头提取 Bearer；成功则返回带 `token` 的上下文数据。
     */
    async authenticate(req: IncomingMessage): Promise<AuthResult | false> {
        const raw = req.headers.authorization
        if (!raw || typeof raw !== 'string' || !raw.startsWith('Bearer ')) {
            return false
        }
        const token = raw.slice('Bearer '.length).trim()
        console.log('token:', token)
        if (!token) {
            return false
        }
        return { data: { token } }
    }

    /**
     * @returns 鉴权失败时的 HTTP 状态与提示
     */
    getAuthError(): { status: number; message: string } {
        return { status: 401, message: '需要 Authorization: Bearer <token>' }
    }
}
