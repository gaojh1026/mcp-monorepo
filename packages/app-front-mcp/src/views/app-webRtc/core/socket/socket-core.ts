/** 信令服务器（websocket）- 核心配置 */

// ----------------------------- 类型定义 -----------------------------

/** 信令消息类型 */
export type SocketMessageType =
    | 'offer'
    | 'answer'
    | 'ice'
    | 'user_join'
    | 'user_leave'
    | 'user_list'
    | 'video_status'
    | 'audio_status'
    | 'chat_message'

interface UserListType {
    id: string
    name?: string
    isSpeaking?: boolean
    hasVideo?: boolean
    hasAudio?: boolean
    joinTime?: number
}

/** 信令消息接口 */
export interface SocketMessage {
    type: SocketMessageType
    candidate?: RTCIceCandidateInit
    sdp?: RTCSessionDescriptionInit
    roomId?: string
    userId?: string
    targetUserId?: string
    timestamp?: number
    userList?: Array<UserListType>
    // 视频/音频状态变化
    enabled?: boolean
    trackId?: string
    // 聊天消息相关
    messageId?: string
    userName?: string
    content?: string
    messageType?: 'text' | 'system' | 'image' | 'file'
}

/** 信令服务配置 */
export type SignalingState = 'connected' | 'disconnected' | 'error'
/** 核心信令配置 */
export interface CoreSignalingConfig {
    serverUrl: string
    roomId: string
    userId: string
    onMessage?: (data: SocketMessage) => void
    onStateChange?: (state: SignalingState) => void // 信令连接状态改变
}

// ------------------------------------------------------------信令服务核心类---------------------------------------------------------

/**
 * 信令服务类
 * 负责处理信令消息、用户加入/离开等逻辑
 */
export class SocketSignaling {
    /** websocket 实例 */
    private socket: WebSocket | null = null // websocket 实例
    /** 重连定时器 */
    private reconnectTimer: number | null = null
    /** 重连次数 */
    private reconnectAttempts = 0
    /** 最大重连次数 */
    private maxReconnectAttempts = 5
    /** 配置 */
    private config: CoreSignalingConfig // 配置

    constructor(config: CoreSignalingConfig) {
        this.config = config

        this.initConnect()
    }

    // ============================websocket 初始化=============================
    /**
     * socket 初始化
     */
    private initConnect() {
        try {
            const { serverUrl, roomId, userId, onStateChange, onMessage } = this.config

            const wsUrl = `${serverUrl}/events?room=${roomId}&userId=${userId}`
            console.log('信令socket连接URL:', wsUrl)

            this.socket = new WebSocket(wsUrl)

            this.socket.onopen = () => {
                console.log('信令socket连接成功')
                this.reconnectAttempts = 0
                onStateChange?.('connected')
            }

            this.socket.onerror = () => {
                console.log('信令socket连接失败')
                onStateChange?.('error')
                this.handleReconnect()
            }

            this.socket.onclose = () => {
                console.log('信令socket连接关闭')
                onStateChange?.('disconnected')
                this.handleReconnect()
            }

            this.socket.onmessage = event => {
                try {
                    const data: SocketMessage = JSON.parse(event.data)
                    console.log('信令socket收到消息:', data)
                    onMessage?.(data)
                } catch (error) {
                    console.error('解析信令消息失败:', error)
                }
            }
        } catch (error) {
            console.error('信令socket连接失败:', error)
            this.handleReconnect()
        }
    }

    /**
     * 重连处理
     */
    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000)

            this.reconnectTimer = window.setTimeout(() => {
                this.initConnect()
            }, delay)
        }
    }

    /**
     * 发送消息
     */
    send(data: SocketMessage): boolean {
        if (this.socket?.readyState !== WebSocket.OPEN) {
            console.error('WebSocket未连接，无法发送消息')
            return false
        }

        const message: SocketMessage = {
            ...data,
            roomId: data.roomId || this.config.roomId,
            userId: data.userId || this.config.userId,
            timestamp: Date.now()
        }

        console.log('=== socket 发送信令消息 ===', message)

        this.socket.send(JSON.stringify(message))
        return true
    }

    // ============================ socket 发送定制消息 =============================
    /**
     * 发送offer
     * @param sdp SDP
     * @param targetUserId 目标用户ID
     * @returns
     */
    sendOffer(sdp: RTCSessionDescriptionInit, targetUserId?: string) {
        return this.send({
            type: 'offer',
            sdp,
            targetUserId
        })
    }

    /**
     * 发送answer
     * @param sdp SDP
     * @param targetUserId 目标用户ID
     * @returns
     */
    sendAnswer(sdp: RTCSessionDescriptionInit, targetUserId?: string) {
        return this.send({
            type: 'answer',
            sdp,
            targetUserId
        })
    }

    /**
     * 发送ICE候选
     * @param candidate ICE候选
     * @param targetUserId 目标用户ID
     * @returns
     */
    sendIceCandidate(candidate: RTCIceCandidateInit, targetUserId?: string) {
        return this.send({
            type: 'ice',
            candidate,
            targetUserId
        })
    }

    /**
     * 用户加入
     */
    sendUserJoin() {
        return this.send({
            type: 'user_join'
        })
    }

    /**
     * 用户离开
     */
    sendUserLeave() {
        return this.send({
            type: 'user_leave'
        })
    }

    /**
     * 发送用户列表
     * @param userList 用户列表
     * @param targetUserId 目标用户ID（可选，不指定则广播给所有用户）
     */
    sendUserList(userList: Array<UserListType>, targetUserId?: string) {
        return this.send({
            type: 'user_list',
            userList,
            targetUserId
        })
    }

    /**
     * 发送视频状态变化
     * @param enabled 视频是否启用
     * @param trackId 视频轨道ID（可选）
     */
    sendVideoStatus(enabled: boolean, trackId?: string) {
        return this.send({
            type: 'video_status',
            enabled,
            trackId
        })
    }

    /**
     * 发送音频状态变化
     * @param enabled 音频是否启用
     * @param trackId 音频轨道ID（可选）
     */
    sendAudioStatus(enabled: boolean, trackId?: string) {
        return this.send({
            type: 'audio_status',
            enabled,
            trackId
        })
    }

    /**
     * 发送聊天消息
     * @param id 消息ID
     * @param userName 用户名
     * @param userId 用户ID
     * @param content 消息内容
     * @param type 消息类型
     */
    sendChatMessage(payload: {
        id: string
        userName?: string
        userId: string
        content: string
        type: 'text' | 'system' | 'image' | 'file'
    }) {
        const { id, userName, content, type } = payload

        return this.send({
            type: 'chat_message',
            messageId: id,
            userName,
            content,
            messageType: type
        })
    }

    /**
     * 关闭连接
     */
    close() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
        if (this.socket) {
            this.socket.close()
            this.socket = null
        }
    }
}
