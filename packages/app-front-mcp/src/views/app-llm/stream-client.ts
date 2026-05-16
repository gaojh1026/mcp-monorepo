import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source'

/**
 * 流式请求配置选项
 */
export interface StreamFetchClientOptions {
    /** 基础请求 URL */
    baseUrl: string
    /** 请求头配置 */
    headers?: Record<string, string>
    /** 请求超时时间（毫秒） */
    timeout?: number
    /** HTTP 请求方法，默认为 POST */
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    /** 是否在页面隐藏时保持连接 */
    openWhenHidden?: boolean
    /** 重试配置 */
    retry?: {
        /** 最大重试次数 */
        maxRetries: number
        /** 重试间隔（毫秒） */
        retryDelay: number
    }
}

/**
 * 流式请求事件处理器
 */
export interface StreamFetchClientHandlers {
    /** 处理接收到的消息 */
    onMessage: (data: any, event: EventSourceMessage) => void
    /** 请求完成回调 */
    onComplete: () => void
    /** 错误处理回调 */
    onError: (error: Error, retryCount?: number) => void
    /** 连接建立回调 */
    onOpen?: () => void
}

/**
 * 请求状态枚举
 */
export enum RequestStatus {
    IDLE = 'idle',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    ERROR = 'error',
    COMPLETED = 'completed'
}

/**
 * 自定义错误类型
 */
export class StreamFetchError extends Error {
    constructor(
        message: string,
        public status?: number,
        public retryCount: number = 0
    ) {
        super(message)
        this.name = 'StreamFetchError'
    }
}

/**
 * @module StreamFetchClient SSE 流式请求管理器
 * @description 基于 @microsoft/fetch-event-source 的 SSE 流式请求管理器
 */
export class StreamFetchClient {
    private options: Required<StreamFetchClientOptions>
    private abortController: AbortController | null = null
    private timeoutId: number | null = null
    private retryCount = 0
    private status: RequestStatus = RequestStatus.IDLE

    constructor(options: StreamFetchClientOptions) {
        this.options = {
            method: 'POST',
            headers: {},
            timeout: 30000,
            openWhenHidden: true,
            retry: {
                maxRetries: 3,
                retryDelay: 1000
            },
            ...options
        }
    }

    /**
     * 发送流式请求
     */
    public async sendRequest(
        params: Record<string, any>,
        handlers: StreamFetchClientHandlers
    ): Promise<void> {
        try {
            this.status = RequestStatus.CONNECTING
            this.abortController = new AbortController()
            this.setupTimeout(handlers)

            const requestConfig = this.buildRequestConfig(params)
            await this.executeRequest(requestConfig, handlers)
        } catch (error) {
            this.handleError(error as Error, handlers)
        }
    }

    /**
     * 断开当前连接
     */
    public disconnect(): void {
        if (this.abortController) {
            this.abortController.abort()
            this.abortController = null
        }
        this.clearTimeout()
        this.status = RequestStatus.IDLE
        this.retryCount = 0
    }

    /**
     * 检查是否已连接
     */
    public isConnected(): boolean {
        return this.status === RequestStatus.CONNECTED
    }

    /**
     * 获取当前请求状态
     */
    public getStatus(): RequestStatus {
        return this.status
    }

    /**
     * 执行流式请求
     */
    private async executeRequest(
        config: ReturnType<typeof this.buildRequestConfig>,
        handlers: StreamFetchClientHandlers
    ): Promise<void> {
        const { url, method, headers, body } = config

        try {
            await fetchEventSource(url, {
                method,
                headers,
                body,
                signal: this.abortController!.signal,
                openWhenHidden: this.options.openWhenHidden,

                onopen: async response => {
                    this.status = RequestStatus.CONNECTED
                    handlers.onOpen?.()
                },

                onmessage: (event: EventSourceMessage) => {
                    this.handleMessage(event, handlers)
                },

                onclose: () => {
                    this.status = RequestStatus.COMPLETED
                    this.clearTimeout()
                    handlers.onComplete()
                },

                onerror: (error: any) => {
                    this.handleStreamError(error, handlers)
                }
            })
        } catch (error) {
            throw new StreamFetchError(
                `请求执行失败: ${error instanceof Error ? error.message : '未知错误'}`
            )
        }
    }

    /**
     * 设置请求超时
     */
    private setupTimeout(handlers: StreamFetchClientHandlers): void {
        if (this.options.timeout) {
            this.timeoutId = setTimeout(() => {
                this.abortController?.abort()
                const timeoutError = new StreamFetchError('请求超时')
                handlers.onError(timeoutError, this.retryCount)
                this.status = RequestStatus.ERROR
            }, this.options.timeout)
        }
    }

    /**
     * 构建请求配置
     */
    private buildRequestConfig(params: Record<string, any>) {
        return {
            url: this.options.baseUrl,
            method: this.options.method,
            headers: {
                'Content-Type': 'application/json',
                ...this.options.headers
            },
            body: JSON.stringify(params)
        }
    }

    /**
     * 处理接收到的消息
     */
    private handleMessage(event: EventSourceMessage, handlers: StreamFetchClientHandlers): void {
        try {
            if (event.data === '[DONE]') return

            let parsedData: any
            try {
                parsedData = JSON.parse(event.data)
            } catch {
                parsedData = event.data
            }

            handlers.onMessage(parsedData, event)
        } catch (error) {
            console.warn('消息处理失败:', error)
        }
    }

    /**
     * 处理流式错误
     */
    private handleStreamError(error: any, handlers: StreamFetchClientHandlers): void {
        this.clearTimeout()

        let streamError: StreamFetchError
        if (error?.status >= 500) {
            streamError = new StreamFetchError('服务器内部错误', error.status, this.retryCount)
        } else if (error?.status >= 400) {
            streamError = new StreamFetchError('请求参数错误', error.status, this.retryCount)
        } else {
            streamError = new StreamFetchError('网络连接错误', undefined, this.retryCount)
        }

        this.status = RequestStatus.ERROR
        handlers.onError(streamError, this.retryCount)
    }

    /**
     * 处理通用错误
     */
    private handleError(error: Error, handlers: StreamFetchClientHandlers): void {
        this.status = RequestStatus.ERROR
        const streamError = new StreamFetchError(
            error.message || '未知错误',
            undefined,
            this.retryCount
        )
        handlers.onError(streamError, this.retryCount)
    }

    /**
     * 清除超时定时器
     */
    private clearTimeout(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
    }
}

export default StreamFetchClient
