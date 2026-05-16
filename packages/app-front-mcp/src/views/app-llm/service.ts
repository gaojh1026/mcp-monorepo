import StreamFetchClient, {
    type StreamFetchClientHandlers,
    type StreamFetchClientOptions,
    RequestStatus,
    StreamFetchError
} from './stream-client'
import type { LLMRequest } from './index.vue'

/**
 * LLM 服务配置选项
 */
export interface LLMServiceOptions {
    /** 基础 API URL */
    baseUrl: string
    /** 请求超时时间（毫秒） */
    timeout?: number
    /** 自定义请求头 */
    headers?: Record<string, string>
    /** 重试配置 */
    retry?: {
        maxRetries: number
        retryDelay: number
    }
}

/**
 * 消息发送结果
 */
export interface MessageResult {
    /** 是否成功 */
    success: boolean
    /** 错误信息 */
    error?: string
    /** 会话 ID */
    sessionId?: string
}

/**
 * 会话信息
 */
export interface SessionInfo {
    /** 会话 ID */
    id: string
    /** 会话标题 */
    title: string
    /** 创建时间 */
    createdAt: number
    /** 最后活跃时间 */
    lastActiveAt: number
    /** 消息数量 */
    messageCount: number
}

/**
 * @description LLM 流式请求服务
 */
export class LLMService {
    private options: Required<LLMServiceOptions>
    private streamClient: StreamFetchClient | null = null
    private currentSessionId: string | null = null
    private isConnected: boolean = false

    constructor(options: LLMServiceOptions) {
        this.options = {
            timeout: 30000,
            headers: {},
            retry: {
                maxRetries: 3,
                retryDelay: 1000
            },
            ...options
        }
    }

    /**
     * 生成唯一 ID
     */
    public generateId(): string {
        const timestamp = Date.now().toString(36)
        const random = Math.random().toString(36).substring(2, 15)
        return `${timestamp}-${random}`
    }

    /**
     * 发送消息并建立 SSE 连接
     */
    async sendMessage(
        request: LLMRequest,
        onMessage: (data: any) => void,
        onError: (error: Error) => void,
        onComplete: () => void,
        onOpen?: () => void
    ): Promise<MessageResult> {
        try {
            if (this.isConnected) {
                this.cancelRequest()
            }

            const sessionId = this.currentSessionId || this.createSession()
            this.currentSessionId = sessionId

            this.streamClient = new StreamFetchClient({
                baseUrl: `${this.options.baseUrl}/nestjs_api/llm/sse`,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId,
                    ...this.options.headers
                },
                method: 'POST',
                timeout: this.options.timeout,
                retry: this.options.retry
            })

            await this.streamClient.sendRequest(request, {
                onMessage: data => onMessage(data),
                onComplete: () => {
                    this.isConnected = false
                    onComplete()
                },
                onError: (error, retryCount) => {
                    this.isConnected = false
                    this.handleError(error, retryCount, onError)
                },
                onOpen: () => {
                    this.isConnected = true
                    onOpen?.()
                }
            })

            return { success: true, sessionId }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误'
            onError(new StreamFetchError(`发送消息失败: ${errorMessage}`))
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 取消当前请求
     */
    cancelRequest(): void {
        if (this.streamClient) {
            this.streamClient.disconnect()
            this.streamClient = null
            this.isConnected = false
        }
    }

    /**
     * 获取当前连接状态
     */
    getConnectionStatus(): RequestStatus {
        return this.streamClient?.getStatus() || RequestStatus.IDLE
    }

    /**
     * 检查是否已连接
     */
    isCurrentlyConnected(): boolean {
        return this.isConnected && this.streamClient?.isConnected() === true
    }

    /**
     * 获取当前会话 ID
     */
    getCurrentSessionId(): string | null {
        return this.currentSessionId
    }

    /**
     * 创建新会话
     */
    createSession(title: string = '新对话'): string {
        const sessionId = this.generateId()
        const sessionInfo: SessionInfo = {
            id: sessionId,
            title,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            messageCount: 0
        }

        this.saveSessionToStorage(sessionInfo)
        return sessionId
    }

    /**
     * 切换到指定会话
     */
    switchSession(sessionId: string): boolean {
        try {
            this.cancelRequest()
            this.currentSessionId = sessionId
            this.updateSessionActivity(sessionId)
            return true
        } catch (error) {
            console.error('切换会话失败:', error)
            return false
        }
    }

    /**
     * 删除指定会话
     */
    deleteSession(sessionId: string): boolean {
        try {
            if (this.currentSessionId === sessionId) {
                this.cancelRequest()
                this.currentSessionId = null
            }
            this.removeSessionFromStorage(sessionId)
            return true
        } catch (error) {
            console.error('删除会话失败:', error)
            return false
        }
    }

    /**
     * 获取所有会话列表
     */
    getAllSessions(): SessionInfo[] {
        try {
            const sessionsJson = localStorage.getItem('llm_sessions')
            return sessionsJson ? JSON.parse(sessionsJson) : []
        } catch (error) {
            console.error('获取会话列表失败:', error)
            return []
        }
    }

    /**
     * 格式化时间
     */
    formatTime(timestamp: number, format: 'time' | 'date' | 'datetime' = 'time'): string {
        if (!timestamp || isNaN(timestamp)) return '--'

        const date = new Date(timestamp)
        const options: Intl.DateTimeFormatOptions = {}

        switch (format) {
            case 'time':
                Object.assign(options, { hour: '2-digit', minute: '2-digit' })
                return date.toLocaleTimeString('zh-CN', options)
            case 'date':
                Object.assign(options, { year: 'numeric', month: '2-digit', day: '2-digit' })
                return date.toLocaleDateString('zh-CN', options)
            case 'datetime':
                Object.assign(options, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                return date.toLocaleString('zh-CN', options)
            default:
                return date.toLocaleTimeString('zh-CN')
        }
    }

    /**
     * 处理错误并决定是否重试
     */
    private handleError(
        error: Error,
        retryCount: number = 0,
        onError: (error: Error) => void
    ): void {
        if (retryCount < this.options.retry.maxRetries) {
            console.warn(
                `请求失败，准备重试 (${retryCount + 1}/${this.options.retry.maxRetries}):`,
                error
            )
            setTimeout(() => {
                console.log('执行重试...')
            }, this.options.retry.retryDelay)
        } else {
            console.error('请求失败，已达到最大重试次数:', error)
            onError(error)
        }
    }

    /**
     * 保存会话信息到本地存储
     */
    private saveSessionToStorage(sessionInfo: SessionInfo): void {
        try {
            const sessions = this.getAllSessions()
            const existingIndex = sessions.findIndex(s => s.id === sessionInfo.id)

            if (existingIndex >= 0) {
                sessions[existingIndex] = sessionInfo
            } else {
                sessions.push(sessionInfo)
            }

            localStorage.setItem('llm_sessions', JSON.stringify(sessions))
        } catch (error) {
            console.error('保存会话信息失败:', error)
        }
    }

    /**
     * 从本地存储中删除会话
     */
    private removeSessionFromStorage(sessionId: string): void {
        try {
            const sessions = this.getAllSessions()
            const filteredSessions = sessions.filter(s => s.id !== sessionId)
            localStorage.setItem('llm_sessions', JSON.stringify(filteredSessions))
        } catch (error) {
            console.error('删除会话信息失败:', error)
        }
    }

    /**
     * 更新会话活跃时间
     */
    private updateSessionActivity(sessionId: string): void {
        try {
            const sessions = this.getAllSessions()
            const session = sessions.find(s => s.id === sessionId)

            if (session) {
                session.lastActiveAt = Date.now()
                this.saveSessionToStorage(session)
            }
        } catch (error) {
            console.error('更新会话活跃时间失败:', error)
        }
    }

    /**
     * 清理资源
     */
    destroy(): void {
        this.cancelRequest()
        this.currentSessionId = null
        this.isConnected = false
    }
}

// 创建默认服务实例
export const llmService = new LLMService({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
})
