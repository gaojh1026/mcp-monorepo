/**
 * 跨标签页Token同步工具
 * 使用BroadcastChannel API实现跨标签页的token状态同步
 */

import { TOKEN_TYPE, getToken, setToken, clearToken, logoutTokens } from './auth'

// 消息类型定义
export interface TokenSyncMessage {
    type: 'token_updated' | 'token_expired' | 'logout'
    token?: string
    refreshToken?: string
    timestamp: number
}

/**
 * 跨标签页Token同步类
 */
class TokenSyncManager {
    private channel: BroadcastChannel
    private isInitialized = false

    constructor() {
        // 创建BroadcastChannel实例
        this.channel = new BroadcastChannel('token_sync_channel')
        this.setupMessageListener()
    }

    /**
     * 初始化跨标签页同步
     */
    public init(): void {
        if (this.isInitialized) return

        this.isInitialized = true
        console.log('Token跨标签页工具已初始化')
    }

    /**
     * 设置消息监听器
     */
    private setupMessageListener(): void {
        this.channel.onmessage = (event: MessageEvent<TokenSyncMessage>) => {
            this.handleMessage(event.data)
        }

        // 监听页面可见性变化，确保token状态同步
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // 页面重新可见时，检查token状态
                this.checkTokenStatus()
            }
        })
    }

    /**
     * 处理接收到的消息
     * @param message 消息内容
     */
    private handleMessage(message: TokenSyncMessage): void {
        console.log('token跨标签页工具,处理接收到的消息---', message)
        const { type, token, refreshToken, timestamp } = message

        // 忽略过期的消息（超过5秒）
        if (Date.now() - timestamp > 5000) {
            return
        }

        switch (type) {
            case 'token_updated':
                if (token) {
                    this.updateLocalToken(token, refreshToken)
                }
                break

            case 'token_expired':
                this.handleTokenExpired()
                break

            case 'logout':
                this.handleLogout()
                break
        }
    }

    // ==========================处理token=============================
    /**
     * 检查token状态（页面重新可见时调用）
     */
    private checkTokenStatus(): void {
        const currentToken = getToken(TOKEN_TYPE.ACCESS)

        console.log('页面可见性变化，检查token状态---', currentToken)
        if (!currentToken) {
            // 如果当前标签页没有token，但其他标签页可能有，这里可以触发重新检查
            window.dispatchEvent(new CustomEvent('token-status-check'))
        }
    }

    /**
     * 更新本地token
     * @param accessToken 新的access token
     * @param refreshToken 新的refresh token（可选）
     */
    private updateLocalToken(accessToken: string, refreshToken?: string): void {
        try {
            setToken(TOKEN_TYPE.ACCESS, accessToken)
            if (refreshToken) {
                setToken(TOKEN_TYPE.REFRESH, refreshToken)
            }

            // 触发自定义事件，通知其他组件token已更新
            window.dispatchEvent(
                new CustomEvent('token-updated', {
                    detail: { accessToken, refreshToken }
                })
            )

            console.log('Token已从其他标签页同步更新')
        } catch (error) {
            console.error('更新本地token失败:', error)
        }
    }

    /**
     * 处理token过期
     */
    private handleTokenExpired(): void {
        logoutTokens()
        window.dispatchEvent(new CustomEvent('token-expired'))
        console.log('Token已过期，从其他标签页同步登出')
    }

    /**
     * 处理登出
     */
    private handleLogout(): void {
        logoutTokens()
        window.dispatchEvent(new CustomEvent('user-logout'))
        console.log('用户已从其他标签页登出')
    }

    // ==========================广播消息=============================
    /**
     * 广播token更新消息
     * @param accessToken 新的access token
     * @param refreshToken 新的refresh token（可选）
     */
    public broadcastTokenUpdate(accessToken: string, refreshToken?: string): void {
        const message: TokenSyncMessage = {
            type: 'token_updated',
            token: accessToken,
            refreshToken,
            timestamp: Date.now()
        }

        this.channel.postMessage(message)
        console.log('已广播token更新消息到其他标签页')
    }

    /**
     * 广播token过期消息
     */
    public broadcastTokenExpired(): void {
        const message: TokenSyncMessage = {
            type: 'token_expired',
            timestamp: Date.now()
        }

        this.channel.postMessage(message)
        console.log('已广播token过期消息到其他标签页')
    }

    /**
     * 广播登出消息
     */
    public broadcastLogout(): void {
        const message: TokenSyncMessage = {
            type: 'logout',
            timestamp: Date.now()
        }

        this.channel.postMessage(message)
        console.log('已广播登出消息到其他标签页')
    }

    /**
     * 销毁实例
     */
    public destroy(): void {
        this.channel.close()
        this.isInitialized = false
        console.log('Token跨标签页同步已销毁')
    }
}

// 创建单例实例
export const tokenSyncManager = new TokenSyncManager()

// 导出类型和实例
export { TokenSyncManager }
export default tokenSyncManager
