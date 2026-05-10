/**
 * IUC 服务客户端
 *
 * 对接内部统一认证服务（iuc），提供：
 * - 账号密码登录，获取 access_token 和 refresh_token
 * - refresh_token 刷新，获取新的 access_token
 * - token 校验（可选）
 */

import { z } from 'zod'

const TokenResponseSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional(),
    token_type: z.string().optional().default('Bearer')
})

export type TokenResponse = z.infer<typeof TokenResponseSchema>

export interface IUCConfig {
    baseUrl: string
    clientId: string
    clientSecret?: string
}

export class IUCAuthError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly code?: string
    ) {
        super(message)
        this.name = 'IUCAuthError'
    }
}

export class IUCClient {
    private baseUrl: string
    private clientId: string
    private clientSecret?: string

    constructor(config: IUCConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '')
        this.clientId = config.clientId
        this.clientSecret = config.clientSecret
    }

    async login(
        username: string,
        password: string,
        captcha?: string,
        captchaId?: string
    ): Promise<TokenResponse> {
        const body: Record<string, string> = {
            username,
            password,
            client_id: this.clientId
        }
        if (captcha) body.captcha = captcha
        if (captchaId) body.captcha_id = captchaId

        const res = await fetch(`${this.baseUrl}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const error = (await res.json().catch(() => ({}))) as {
                message?: string
                code?: string
            }
            throw new IUCAuthError(
                error.message || `登录失败: ${res.status}`,
                res.status,
                error.code
            )
        }

        const data = await res.json()
        return TokenResponseSchema.parse(data)
    }

    async refresh(refreshToken: string): Promise<TokenResponse> {
        const body: Record<string, string> = {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: this.clientId
        }
        if (this.clientSecret) body.client_secret = this.clientSecret

        const res = await fetch(`${this.baseUrl}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const error = (await res.json().catch(() => ({}))) as {
                message?: string
                code?: string
            }
            throw new IUCAuthError(
                error.message || `刷新token失败: ${res.status}`,
                res.status,
                error.code
            )
        }

        const data = await res.json()
        return TokenResponseSchema.parse(data)
    }

    async revoke(token: string): Promise<void> {
        await fetch(`${this.baseUrl}/oauth/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, client_id: this.clientId })
        })
    }
}
