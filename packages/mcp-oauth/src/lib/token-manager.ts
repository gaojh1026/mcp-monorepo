/**
 * Token 管理器
 *
 * 职责：
 * - 存储 access_token 和 refresh_token
 * - 自动刷新即将过期的 token
 * - 并发请求共享同一个刷新流程（防止多次刷新）
 */

import { IUCClient, type TokenResponse } from './iuc-client.js'

export interface TokenStore {
    accessToken: string
    refreshToken: string
    expiresAt: number
}

export interface TokenManagerConfig {
    iucClient: IUCClient
    autoRefreshBeforeMs?: number
    onTokenRefreshed?: (tokens: TokenResponse) => void
    onTokenExpired?: () => void
}

export class TokenManager {
    private store: TokenStore | null = null
    private refreshDeferred: Promise<TokenStore> | null = null
    private iucClient: IUCClient
    private autoRefreshBeforeMs: number

    constructor(config: TokenManagerConfig) {
        this.iucClient = config.iucClient
        this.autoRefreshBeforeMs = config.autoRefreshBeforeMs ?? 60_000
    }

    async login(username: string, password: string): Promise<TokenStore> {
        const tokens = await this.iucClient.login(username, password)
        this.store = this.buildStore(tokens)
        return this.store
    }

    async getAccessToken(): Promise<string> {
        if (!this.store) {
            throw new Error('未登录，请先调用 login()')
        }
        if (this.isExpiringSoon(this.store)) {
            await this.refreshIfNeeded()
        }
        return this.store!.accessToken
    }

    private isExpiringSoon(store: TokenStore): boolean {
        return Date.now() >= store.expiresAt - this.autoRefreshBeforeMs
    }

    private buildStore(tokens: TokenResponse): TokenStore {
        const expiresInMs = (tokens.expires_in ?? 3600) * 1000
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? '',
            expiresAt: Date.now() + expiresInMs
        }
    }

    private async refreshIfNeeded(): Promise<void> {
        if (!this.store) return
        if (this.refreshDeferred) {
            await this.refreshDeferred
            return
        }
        this.refreshDeferred = this.doRefresh()
        try {
            await this.refreshDeferred
        } finally {
            this.refreshDeferred = null
        }
    }

    private async doRefresh(): Promise<TokenStore> {
        if (!this.store?.refreshToken) {
            throw new Error('refresh_token 不存在，无法刷新')
        }
        const tokens = await this.iucClient.refresh(this.store.refreshToken)
        this.store = this.buildStore(tokens)
        return this.store
    }

    setStore(tokens: TokenResponse): void {
        this.store = this.buildStore(tokens)
    }

    clear(): void {
        this.store = null
    }
}
