/** 信令服务器（websocket）- 管理器（主要进行业务处理,基于SocketSignaling进行封装） */

// ----------------------------- 信令服务器类型定义 -----------------------------

import { message } from 'ant-design-vue'
import { useMeetingStore } from '@/stores/meeting'
// 导入信令核心
import { SocketSignaling } from './socket-core'
import type { CoreSignalingConfig, SignalingState, SocketMessage } from './socket-core'
// 导入webRTC管理器
import { WebRTCManager } from '../webRTC'
// 导入视频管理器
import type { VideoManager } from '../../utils/video-manager'
// 导入方法
import { handleRecordEvent } from './socket-utils'

/**
 * 信令服务管理器配置
 * @interface SignalingManagerConfig
 * @property {string} serverUrl - 信令服务器URL
 * @property {string} roomId - 房间ID
 * @property {string} userId - 用户ID
 * @property {function} onMessage - 信令消息回调
 * @property {function} onStateChange - 信令状态变化回调
 * @property {WebRTCManager} webRTCManager - webRTC管理器
 * @property {function} getLocalStream - 获取本地流
 * @property {string} currentUserId - 当前用户ID
 * @property {VideoManager} videoManager - 视频管理器
 */
export interface SignalingManagerConfig {
    serverUrl: string
    roomId: string
    userId: string
    webRTCManager: WebRTCManager
    currentUserId?: string
    videoManager?: VideoManager
    onMessage?: (data: SocketMessage) => void // 信令消息回调
    onStateChange?: (state: SignalingState) => void // 信令状态变化回调
    getLocalStream?: () => Promise<void>
}

// ------------------------------------------------------------信令服务管理器---------------------------------------------------------

/**
 * 信令服务管理器（主要进行业务处理）
 *  1、初始化了websocket，同时在websocket就有了一些发送给信令服务器的方法（例如用户离开、加入、offer等）
 *  2、在websocket的回调中，会调用一些方法，处理信令服务器返回的方法，在这之中就把webRTC融合进去了
 *  3、同时进行处理或者提供一些方法，例如如果用户加入，该做什么处理
 */
export class SignalingManager {
    /** 信令服务核心 */
    public signalingService: SocketSignaling
    /** 配置 */
    private managerConfig: SignalingManagerConfig
    /** 记录已在进行的建链，避免重复同时发起 */
    private pendingOfferTargets: Set<string> = new Set()
    /** 会议状态管理 */
    private meetingStore = useMeetingStore()

    constructor(config: SignalingManagerConfig) {
        this.managerConfig = config

        // 1、初始化信令服务
        const coreConfig: CoreSignalingConfig = {
            serverUrl: config.serverUrl,
            roomId: config.roomId,
            userId: config.userId,
            onMessage: data => {
                this.onMessageSign(data)
            },
            onStateChange: state => {
                this.onStateChangeSign(state)
            }
        }
        this.signalingService = new SocketSignaling(coreConfig)

        // 2、绑定 WebRTC 事件到信令发送与业务处理
        this.bindWebRTCEventHandlers()
    }

    // ================================================================ 模块一：webRTC管理 =================================================================

    /**
     * 获取 WebRTC 管理器
     */
    private getWebRTCManager(): WebRTCManager {
        const mgr = this.managerConfig.webRTCManager
        if (!mgr) {
            throw new Error('webRTCManager 未初始化')
        }
        return mgr
    }

    /**
     * 绑定 WebRTC 事件处理器
     */
    private bindWebRTCEventHandlers() {
        const webRTCManager = this.getWebRTCManager()

        webRTCManager.onSendSignal = (remoteId, signal) => {
            const targetId = String(remoteId)
            if (signal?.type === 'offer') {
                this.signalingService.sendOffer(signal, targetId)
                this.pendingOfferTargets.add(targetId)
            } else if (signal?.type === 'answer') {
                this.signalingService.sendAnswer(signal, targetId)
                // answer 发出后，认为该目标不再处于“发起中”
                this.pendingOfferTargets.delete(targetId)
            }
        }

        webRTCManager.onIceCandidate = (remoteId, candidate) => {
            const targetId = String(remoteId)
            this.signalingService.sendIceCandidate(candidate, targetId)
        }

        // 数据通道开放时，标记连接稳定
        webRTCManager.onDataChannel = (remoteId, channel) => {}

        webRTCManager.onRemoteStream = (remoteId, stream) => {
            this.handleRemoteStream(String(remoteId), stream)
        }

        webRTCManager.onPeerConnectionStateChange = (remoteId, connectionState) => {
            this.handleConnectionStateChange(String(remoteId), connectionState)
        }
        // 录制事件回调
        webRTCManager.recordingManager.onRecord = ({ status, blob }) => {
            handleRecordEvent(status, blob)
        }
    }

    // ================================================================通用方法========================================================
    /**
     * 获取自身用户ID（统一入口）
     */
    private get selfId(): string {
        return String(this.managerConfig.currentUserId || this.managerConfig.userId)
    }

    /**
     * 是否由当前端对某远端发起连接（确定性发起方规则）
     * 规则：仅当 selfId < remoteId 时发起，反之等待对方
     */
    private shouldInitiateTo(remoteId: string): boolean {
        const self = this.selfId
        if (self === remoteId) return false

        // 优先数值比较，否则字符串比较
        const a = Number(self)
        const b = Number(remoteId)
        if (!Number.isNaN(a) && !Number.isNaN(b)) {
            return a < b
        }
        return self < remoteId
    }
    /**
     * 广播用户存在
     */
    broadcastUserPresence() {
        return this.signalingService.sendUserJoin()
    }

    /**
     * 广播用户离开
     */
    broadcastUserLeave() {
        return this.signalingService.sendUserLeave()
    }

    /**
     * 向指定用户发送当前用户列表
     * @param targetUserId 目标用户ID
     */
    sendUserListToUser(targetUserId: string) {
        if (!this.managerConfig) return

        const currentUsers = this.meetingStore.participants.map(participant => ({
            id: participant.id,
            name: participant.name,
            isSpeaking: participant.isSpeaking,
            hasVideo: participant.hasVideo,
            hasAudio: participant.hasAudio,
            joinTime: participant.joinTime
        }))

        currentUsers.push({
            id: this.managerConfig.userId,
            name: this.meetingStore.currentUser.name,
            isSpeaking: this.meetingStore.webRTCState.localSpeaking,
            hasVideo: this.meetingStore.webRTCState.camOn,
            hasAudio: this.meetingStore.webRTCState.micOn,
            joinTime: Date.now()
        })

        this.signalingService.sendUserList(currentUsers, targetUserId)
    }

    /**
     * 向特定用户发送offer
     */
    async sendOfferToUser(userId: string) {
        if (userId === this.selfId) return

        if (this.getWebRTCManager().peerConnections[userId]) {
            return
        }
        // 仅满足确定性规则时才发起，避免对撞
        if (!this.shouldInitiateTo(userId)) return
        // 若该目标已在发起中，避免重复
        if (this.pendingOfferTargets.has(userId)) return

        try {
            if (!this.getWebRTCManager().localStream) {
                await this.managerConfig.getLocalStream?.()
                // 移除：不基于本地流获取设置连接状态
            }
            await this.getWebRTCManager().callManager.startCall(userId)
        } catch (error) {
            // 静默处理
            this.pendingOfferTargets.delete(userId)
        }
    }

    // ================================================================socket回调========================================================
    /**
     * 处理socket状态变化
     */
    onStateChangeSign(state: SignalingState) {
        this.meetingStore.setSignalingState(state)
        if (state === 'error' || state === 'disconnected') {
            // 避免重复提示
            if (this.meetingStore.signalingState !== state) {
                message.error('信令服务器连接失败')
            }
        }
    }

    /**
     * 消息处理器映射表
     * 使用映射表替代 switch 语句，提高代码可读性和可维护性
     * 新增消息类型时只需添加对应的处理方法即可
     */
    private messageHandlers: Record<string, (data: SocketMessage) => Promise<void>> = {
        answer: this.handleAnswerMessage.bind(this),
        offer: this.handleOfferMessage.bind(this),
        ice: this.handleIceMessage.bind(this),
        user_join: this.handleUserJoined.bind(this),
        user_leave: this.handleUserLeft.bind(this),
        user_list: this.handleUserListMessage.bind(this),
        video_status: this.handleVideoStatusMessage.bind(this),
        audio_status: this.handleAudioStatusMessage.bind(this),
        chat_message: this.handleChatMessage.bind(this)
    }

    /**
     * 处理socket信息回调
     */
    private async onMessageSign(data: SocketMessage) {
        const { type, userId } = data
        const selfId = this.selfId

        // 检查消息来源
        if (!userId) {
            console.error('收到缺少 userId 的信令，已忽略：', data)
            return
        }

        if (userId === selfId) {
            console.log('收到自己的信令，已忽略：')
            return
        }

        // 使用映射表分发消息处理
        const handler = this.messageHandlers[type]
        if (handler) {
            await handler(data)
        }
    }

    // ================================================================ 消息处理 ========================================================

    /**
     * 类型一：处理 answer 消息
     */
    private async handleAnswerMessage(data: SocketMessage) {
        const { sdp, userId, targetUserId } = data
        const selfId = this.selfId

        // 仅处理明确指向本端的应答，避免广播造成混乱
        if (sdp && targetUserId === selfId) {
            await this.getWebRTCManager().handleAnswer(String(userId), sdp)
        }
    }

    /**
     * 类型二：处理 offer 消息
     */
    private async handleOfferMessage(data: SocketMessage) {
        const { sdp, userId, targetUserId } = data
        const selfId = this.selfId

        // 仅处理明确指向本端的要约，避免广播造成互相同时处理
        if (sdp && targetUserId === selfId) {
            await this.handleOffer(String(userId), sdp)
            // 收到对方 offer，说明对方为发起方，取消本端对该目标的 pending
            this.pendingOfferTargets.delete(String(userId))
        }
    }

    /**
     * 类型三：处理 ice 消息
     */
    private async handleIceMessage(data: SocketMessage) {
        const { candidate, userId, targetUserId } = data
        const selfId = this.selfId

        // 仅处理指向本端的 ICE
        if (candidate && targetUserId === selfId) {
            await this.getWebRTCManager().handleIceCandidate(String(userId), candidate)
        }
    }

    /**
     * 类型四：处理用户列表消息
     */
    private async handleUserListMessage(data: SocketMessage) {
        await this.handleUserList(data.userList || [])
    }

    /**
     * 类型五：处理视频状态消息
     */
    private async handleVideoStatusMessage(data: SocketMessage) {
        const { userId, enabled } = data
        await this.handleVideoStatusChange(String(userId), enabled || false)
    }

    /**
     * 类型六：处理音频状态消息
     */
    private async handleAudioStatusMessage(data: SocketMessage) {
        const { userId, enabled } = data
        await this.handleAudioStatusChange(String(userId), enabled || false)
    }

    // ================================================================工具方法========================================================

    /**
     * 处理远程流接收
     * @param remoteId 远程用户ID
     * @param stream 远程流
     */
    private handleRemoteStream(remoteId: string, stream: MediaStream) {
        console.log('🎥 处理远程流接收:', remoteId, stream)
        const id = String(remoteId)

        this.meetingStore.meetingStatusStore.addRemoteStream(id, stream)
        this.managerConfig.videoManager?.setupRemoteVideoTrackListener(id, stream)

        setTimeout(() => {
            this.managerConfig?.videoManager?.updateRemoteVideoDisplay(id)
            this.managerConfig?.videoManager?.bindRemoteVideo(id)
            this.managerConfig?.videoManager?.bindMainVideo()
        }, 0)

        if (!this.meetingStore.meetingStatusStore.getParticipant(id)) {
            this.meetingStore.meetingStatusStore.addParticipant({
                id,
                name: `用户_${id.slice(-6)}`,
                hasVideo: stream.getVideoTracks().length > 0,
                hasAudio: stream.getAudioTracks().length > 0
            })
        }

        setTimeout(() => {
            this.managerConfig?.videoManager?.bindMainVideo()
        }, 0)
    }

    /**
     * 处理连接状态变化
     */
    private handleConnectionStateChange(remoteId: string, connectionState: string) {
        // 以"至少一个连接已 connected"为全局连接态
        const anyConnected =
            Object.values(this.getWebRTCManager().peerConnections).some(
                pc => pc.connectionState === 'connected'
            ) || connectionState === 'connected'
        this.meetingStore.setConnected(anyConnected)

        if (connectionState === 'connected') {
            const id = String(remoteId)
            const stream = this.getWebRTCManager().remoteStreams[id]
            if (stream) {
                this.handleRemoteStream(id, stream)
            }
            setTimeout(() => {
                this.managerConfig?.videoManager?.updateRemoteVideoDisplay(id)
                this.managerConfig?.videoManager?.bindRemoteVideo(id)
                this.managerConfig?.videoManager?.bindMainVideo()
            }, 0)
        } else if (connectionState === 'disconnected' || connectionState === 'failed') {
            const id = String(remoteId)
            this.meetingStore.removeParticipant(id)
            this.managerConfig.videoManager?.cleanupVideoStatusListener(id)
            // 更新全局连接态（其它连接可能仍在线）
            const stillConnected = Object.values(this.getWebRTCManager().peerConnections).some(
                pc => pc.connectionState === 'connected'
            )
            this.meetingStore.setConnected(stillConnected)
        }
    }

    /**
     * 处理 offer 消息
     */
    private async handleOffer(remoteId: string, sdp: RTCSessionDescriptionInit) {
        try {
            if (!this.getWebRTCManager().localStream) {
                await this.managerConfig.getLocalStream?.()
            }

            await this.getWebRTCManager().callManager.answerCall(remoteId, sdp)

            if (!this.meetingStore.webRTCState.connected) {
                this.meetingStore.setConnected(true)
                message.info('已接听通话')
            }
        } catch (error) {
            console.error('❌ 处理 OFFER 失败:', error)
            message.error('接听通话失败')
        }
    }

    /**
     * 处理用户加入
     */
    private async handleUserJoined(data: SocketMessage) {
        const remoteId = String(data.userId)
        if (remoteId === this.selfId) return

        if (!this.meetingStore.getParticipant(remoteId)) {
            this.meetingStore.addParticipant({
                id: remoteId,
                name: `用户_${remoteId.slice(-6)}`
            })

            // 添加用户加入的系统消息
            this.meetingStore.addChatMessage({
                id: `system_join_${Date.now()}`,
                userId: 'system',
                userName: '系统',
                content: `用户 ${remoteId.slice(-6)} 加入了会议`,
                timestamp: Date.now(),
                type: 'system',
                isLocal: false
            })
        }

        this.sendUserListToUser(remoteId)

        if (!this.getWebRTCManager().localStream) {
            try {
                await this.managerConfig.getLocalStream?.()
                // 移除：不基于本地流获取设置连接状态
                await this.sendOfferToUser(remoteId)
            } catch (error) {
                // 静默处理
            }
        } else if (this.meetingStore.webRTCState.connected) {
            await this.sendOfferToUser(remoteId)
        }
    }

    /**
     * 处理用户离开
     */
    private async handleUserLeft(data: SocketMessage) {
        const remoteId = String(data.userId)
        if (remoteId === this.selfId) return

        // 添加用户离开的系统消息
        this.meetingStore.addChatMessage({
            id: `system_leave_${Date.now()}`,
            userId: 'system',
            userName: '系统',
            content: `用户 ${remoteId.slice(-6)} 离开了会议`,
            timestamp: Date.now(),
            type: 'system',
            isLocal: false
        })
        this.meetingStore.removeParticipant(remoteId)
        this.getWebRTCManager().callManager.hangUp(remoteId)
    }

    /**
     * 处理用户列表消息
     */
    private async handleUserList(
        userList: Array<{
            id: string
            name?: string
            isSpeaking?: boolean
            hasVideo?: boolean
            hasAudio?: boolean
            joinTime?: number
        }>
    ) {
        this.meetingStore.clearParticipants()
        userList.forEach(user => {
            if (user.id !== this.selfId) {
                this.meetingStore.addParticipant({
                    id: user.id,
                    name: user.name || `用户_${user.id.slice(-6)}`,
                    isSpeaking: user.isSpeaking,
                    hasVideo: user.hasVideo,
                    hasAudio: user.hasAudio,
                    joinTime: user.joinTime
                })
            }
        })

        // 针对列表中的每位用户，若尚未建立连接则发起 offer（实现多人自动建链）
        for (const user of userList) {
            const uid = user.id
            if (!uid || uid === this.selfId) continue
            if (!this.getWebRTCManager().peerConnections[uid]) {
                try {
                    if (!this.getWebRTCManager().localStream) {
                        await this.managerConfig.getLocalStream?.()
                    }
                    await this.sendOfferToUser(uid)
                } catch (err) {
                    // 静默处理单个用户建链失败，不影响其它
                }
            }
        }
    }

    /**
     * 处理视频状态变化
     * @param remoteId 远程用户ID
     * @param enabled 视频是否启用
     */
    private async handleVideoStatusChange(remoteId: string, enabled: boolean) {
        try {
            this.meetingStore.updateParticipant(remoteId, { hasVideo: enabled })
            this.meetingStore.setRemoteVideoState(remoteId, enabled)

            const remoteStream = this.getWebRTCManager().remoteStreams[remoteId]
            if (remoteStream) {
                const videoTracks = remoteStream.getVideoTracks()
                videoTracks.forEach(track => {
                    track.enabled = enabled
                })
            }
        } catch (error) {
            console.error(`处理用户 ${remoteId} 视频状态变化失败:`, error)
        }
    }

    /**
     * 处理音频状态变化
     * @param remoteId 远程用户ID
     * @param enabled 音频是否启用
     */
    private async handleAudioStatusChange(remoteId: string, enabled: boolean) {
        try {
            this.meetingStore.updateParticipant(remoteId, { hasAudio: enabled })

            if (!enabled) {
                const remoteStream = this.getWebRTCManager().remoteStreams[remoteId]
                if (remoteStream) {
                    const audioTracks = remoteStream.getAudioTracks()
                    audioTracks.forEach(track => {
                        track.enabled = false
                    })
                }
            }
        } catch (error) {
            console.error(`处理用户 ${remoteId} 音频状态变化失败:`, error)
        }
    }

    /**
     * 处理聊天信息
     * @param {SocketMessage} data 聊天消息数据
     */
    private async handleChatMessage(data: SocketMessage) {
        try {
            const { messageId, userId, userName, content, timestamp, messageType } = data

            const chatMessage = {
                id: messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: userId || 'system',
                userName: userName || '系统',
                content: content || '',
                timestamp: timestamp || Date.now(),
                type: (messageType || 'text') as 'text' | 'system' | 'image' | 'file',
                isLocal: false
            }

            this.meetingStore.addChatMessage(chatMessage)
        } catch (error) {
            console.error('处理聊天信息失败：', error)
        }
    }

    /**
     * 关闭信令服务并清理资源
     */
    close() {
        try {
            // 清理待处理的 offer 目标
            this.pendingOfferTargets.clear()

            // 挂断所有 WebRTC 连接
            const webRTCManager = this.getWebRTCManager()
            Object.keys(webRTCManager.peerConnections).forEach(remoteId => {
                try {
                    webRTCManager.callManager.hangUp(remoteId)
                } catch (error) {
                    console.warn(`挂断连接失败: ${remoteId}`, error)
                }
            })

            // 清理视频管理器状态
            if (this.managerConfig.videoManager) {
                // 清理所有远程视频状态监听器
                Object.keys(this.meetingStore.participants).forEach(participantId => {
                    this.managerConfig.videoManager?.cleanupVideoStatusListener(participantId)
                })
            }

            // 清理会议状态
            this.meetingStore.clearParticipants()
            this.meetingStore.setConnected(false)
        } catch (error) {
            console.error('关闭信令服务时发生错误:', error)
        } finally {
            // 确保信令服务被关闭
            return this.signalingService.close()
        }
    }
}
