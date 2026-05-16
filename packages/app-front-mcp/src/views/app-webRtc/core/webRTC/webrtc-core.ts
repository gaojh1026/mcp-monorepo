/** WebRTC- 核心处理 */

// -------------------------------------------------- 类型定义 --------------------------------------------------

/** 房间标识，可为字符串或数字 */
export type RoomId = string | number
/** ICE 候选回调 */
export type IceCandidateCallback = (remoteId: RoomId, candidate: RTCIceCandidate) => void
/** 信令发送回调（用于发送 offer/answer） */
export type SendSignalCallback = (remoteId: RoomId, signal: RTCSessionDescriptionInit) => void
/** 远端媒体流回调 */
export type RemoteStreamCallback = (remoteId: RoomId, stream: MediaStream) => void
/** PeerConnection 状态变化回调 */
export type PeerStateCallback = (remoteId: RoomId, state: RTCPeerConnectionState) => void
/** 数据通道回调 */
export type DataChannelCallback = (remoteId: RoomId, dataChannel: RTCDataChannel) => void

/** WebRTCConfig 配置项 */
export interface WebRTCConfig {
    roomId: RoomId
    iceServers?: RTCIceServer[]
    onDataChannel?: DataChannelCallback
    onIceCandidate?: IceCandidateCallback
    onSendSignal?: SendSignalCallback
    onRemoteStream?: RemoteStreamCallback
    onPeerConnectionStateChange?: PeerStateCallback
}

// -------------------------------------------------- WebRTC核心管理类 --------------------------------------------------

/**
 * 核心 WebRTC管理类，只提供对 WebRTC P2P 连接、媒体流等能力的统一封装
 * @description 可以在此基础上扩展业务功能
 */
export class CoreWebRTC {
    // 本地视频流
    localStream: MediaStream | null
    // 屏幕共享流
    screenStream: MediaStream | null
    // 远程流集合，键为远程用户的 ID，值为对应的媒体流
    remoteStreams: { [remoteId: string]: MediaStream }
    // 保存多个 PeerConnection 对象，键为远程用户的 ID
    peerConnections: { [remoteId: string]: RTCPeerConnection }
    // ICE 服务器列表，用于建立 P2P 连接
    iceServers: RTCIceServer[]
    // 当前连接的 PeerConnection 对象
    peer: RTCPeerConnection | null
    // 数据通道
    dataChannel: RTCDataChannel | null
    // 多路数据通道（按远端ID存储）
    dataChannels: { [remoteId: string]: RTCDataChannel }
    // 房间 ID
    roomId: RoomId
    // ICE 候选回调
    onIceCandidate: IceCandidateCallback
    // 信令回调
    onSendSignal: SendSignalCallback
    // 远程流回调
    onRemoteStream: RemoteStreamCallback
    // 连接状态回调
    onPeerConnectionStateChange: PeerStateCallback
    // 数据通道回调
    onDataChannel: DataChannelCallback

    constructor(config: WebRTCConfig = { roomId: '' }) {
        // 获取配置项
        const {
            roomId,
            iceServers,
            onDataChannel,
            onIceCandidate,
            onSendSignal,
            onRemoteStream,
            onPeerConnectionStateChange
        } = config

        this.iceServers = iceServers || [{ urls: 'stun:stun.l.google.com:19302' }]
        this.roomId = roomId

        // 初始化媒体流与连接状态相关属性
        this.localStream = null
        this.screenStream = null
        this.remoteStreams = {}
        this.peer = null
        this.peerConnections = {}
        this.dataChannel = null
        this.dataChannels = {}

        // 初始化默认的空实现回调，避免判空
        this.onIceCandidate = onIceCandidate || (() => {})
        this.onSendSignal = onSendSignal || (() => {})
        this.onRemoteStream = onRemoteStream || (() => {})
        this.onPeerConnectionStateChange = onPeerConnectionStateChange || (() => {})
        this.onDataChannel = onDataChannel || (() => {})
    }

    // ========================================== 模块一：PeerConnection 管理 ==========================================

    /**
     * 创建并初始化 RTCPeerConnection
     * @param remoteId 远程用户 ID
     * @returns RTCPeerConnection 实例
     */
    createPeerConnection(remoteId: RoomId): RTCPeerConnection {
        console.log('🔗 === 创建PeerConnection ===', { remoteId })

        const peer = new RTCPeerConnection({ iceServers: this.iceServers })
        this.peer = peer

        // 监听一：ICE 候选事件
        peer.onicecandidate = event => {
            console.log('=== onicecandidate事件触发 ===', { remoteId })

            if (event.candidate) {
                this.onIceCandidate(remoteId, event.candidate)
            }
        }

        // 监听二：远程流轨道事件
        peer.ontrack = event => {
            console.log('=== ontrack事件触发 ===', { remoteId })

            if (!this.remoteStreams[remoteId]) {
                this.remoteStreams[remoteId] = new MediaStream()
            }

            this.remoteStreams[remoteId].addTrack(event.track)
            console.log('轨道已添加到远程流:', { remoteId })

            this.onRemoteStream(remoteId, this.remoteStreams[remoteId])
        }

        // 监听三：连接状态变化事件
        peer.onconnectionstatechange = () => {
            const connectionState = peer.connectionState
            console.log('🔗 === WebRTC连接状态变化 ===', { remoteId })
            this.onPeerConnectionStateChange(remoteId, connectionState)
            if (connectionState === 'failed' || connectionState === 'disconnected') {
                // 异步尝试 ICE 重启
                this.tryRestartIce(remoteId).catch(() => {})
            }
        }

        // 监听四：ICE连接状态变化事件
        peer.oniceconnectionstatechange = () => {
            console.log('🧊 === ICE连接状态变化 ===', { remoteId })
            if (
                peer.iceConnectionState === 'failed' ||
                peer.iceConnectionState === 'disconnected'
            ) {
                this.tryRestartIce(remoteId).catch(() => {})
            }
        }

        // 监听五：数据通道建立事件
        peer.ondatachannel = event => {
            this.dataChannel = event.channel
            this.dataChannels[String(remoteId)] = event.channel
            console.log('🔄 === 数据通道建立 ===', { remoteId, label: event.channel?.label })
            this.onDataChannel(remoteId, event.channel)
        }

        // 将初始化的 PeerConnection 对象保存到 peerConnections 集合中
        this.peerConnections[remoteId] = peer

        return peer
    }

    /**
     * 创建并发送 offer（发起方）
     * @param remoteId 远端 ID
     */
    async createOffer(remoteId: RoomId) {
        console.log('🔄 === 开始创建OFFER ===', { remoteId })

        try {
            const peer = this.createPeerConnection(remoteId)

            if (this.localStream) {
                this.addStreamToConnection(peer, this.localStream)
            } else {
                console.log('⚠️ 本地流为空，无法添加到offer中')
            }

            // 发起方预先创建数据通道，提升可靠性
            this.createDataChannel(remoteId, 'data', { ordered: true })

            const offer = await peer.createOffer()
            await peer.setLocalDescription(offer)

            this.onSendSignal(remoteId, offer)
            console.log('🎉 === OFFER创建并发送完成 ===')
        } catch (error) {
            console.error('❌ 创建 OFFER 失败:', error)
            throw error
        }
    }

    /**
     * 创建并发送 answer（应答方）
     * @param remoteId 远端 ID
     * @param offer 对方的 offer 描述
     */
    async createAnswer(remoteId: RoomId, offer: RTCSessionDescriptionInit) {
        console.log('=== 开始创建ANSWER ===', { remoteId })

        try {
            // 获取已存在的 PeerConnection 或新建一个
            const peer = this.peerConnections[remoteId] || this.createPeerConnection(remoteId)
            console.log('✅ PeerConnection 准备完成', {
                connectionState: peer.connectionState,
                signalingState: peer.signalingState
            })

            // 将本地流添加到 PeerConnection（如果有本地流）
            this.addStreamToConnection(peer, this.localStream)

            // 设置远端 offer 描述
            console.log('设置远端offer描述...')
            await peer.setRemoteDescription(offer)
            console.log('✅ 远端offer描述设置完成')

            // 创建 answer 描述
            console.log('创建answer描述...')
            const answer = await peer.createAnswer()
            console.log('✅ answer描述创建完成', {
                answerType: answer.type,
                hasSdp: !!answer.sdp
            })

            // 设置本地 answer 描述
            console.log('设置本地answer描述...')
            await peer.setLocalDescription(answer)
            console.log('✅ 本地answer描述设置完成')

            // 通过回调发送 answer 信令给远端
            console.log('发送answer信令...', {
                onSendSignalExists: typeof this.onSendSignal === 'function',
                answerType: answer.type
            })
            this.onSendSignal(remoteId, answer)
            console.log('🎉 === ANSWER创建并发送完成 ===')
        } catch (error) {
            console.error('❌ 创建 ANSWER 失败:', error)
            throw error
        }
    }

    /**
     * 处理远端 answer（发起方设置远端描述）
     * @param remoteId 远端 ID
     * @param answer 对方的 answer 描述
     */
    async handleAnswer(remoteId: RoomId, answer: RTCSessionDescriptionInit): Promise<void> {
        // 获取对应远端 ID 的 PeerConnection 实例
        const peer = this.peerConnections[remoteId]
        if (peer) {
            // 将 answer 设置为远端描述，完成信令协商
            await peer.setRemoteDescription(new RTCSessionDescription(answer))
        } else {
            console.error(`处理远端answer失败，远端${remoteId}对应的PeerConnection不存在`)
        }
    }

    /**
     * 处理远端 ICE 候选
     * @param remoteId 远端 ID
     * @param candidate ICE 候选
     */
    async handleIceCandidate(
        remoteId: RoomId,
        candidate: RTCIceCandidateInit | undefined
    ): Promise<void> {
        // 获取对应远端 ID 的 PeerConnection 实例
        const peer = this.peerConnections[remoteId]
        // 如果没有对应的 PeerConnection 或 candidate 为空，则不做处理
        if (!peer) {
            console.warn('跳过添加ICE候选：未找到对应的PeerConnection', { remoteId })
            return
        }
        if (!candidate) {
            console.warn('跳过添加ICE候选：candidate 为空', { remoteId })
            return
        }
        // 如果 PeerConnection 存在且候选不为空，则添加 ICE 候选
        await peer.addIceCandidate(new RTCIceCandidate(candidate))
    }

    /**
     * 创建数据通道（仅在本端作为发起方时调用）
     * @param remoteId 远端ID
     * @param label 通道标签
     * @param options 通道选项
     */
    createDataChannel(
        remoteId: RoomId,
        label: string = 'data',
        options: RTCDataChannelInit = { ordered: true }
    ): RTCDataChannel | null {
        const peer = this.peerConnections[remoteId]
        if (!peer) {
            console.warn('创建数据通道失败：PeerConnection 不存在', { remoteId })
            return null
        }
        if (
            this.dataChannels[String(remoteId)] &&
            this.dataChannels[String(remoteId)].readyState !== 'closed'
        ) {
            return this.dataChannels[String(remoteId)]
        }

        const channel = peer.createDataChannel(label, options)
        this.dataChannels[String(remoteId)] = channel
        this.dataChannel = channel

        channel.onopen = () => {
            console.log('📦 DataChannel open:', { remoteId, label, readyState: channel.readyState })
            this.onDataChannel(remoteId, channel)
        }
        channel.onclose = () => {
            console.log('📦 DataChannel close:', { remoteId, label })
        }
        channel.onerror = err => {
            console.error('📦 DataChannel error:', err)
        }
        channel.onmessage = ev => {
            console.log('📦 DataChannel message:', { remoteId, size: ev.data?.length || 0 })
        }

        return channel
    }

    /**
     * 在连接失败时尝试 ICE 重启
     */
    private async tryRestartIce(remoteId: RoomId) {
        const peer = this.peerConnections[remoteId]
        if (!peer) return
        try {
            console.log('🧊 尝试 ICE 重启...', { remoteId })
            const offer = await peer.createOffer({ iceRestart: true })
            await peer.setLocalDescription(offer)
            this.onSendSignal(remoteId, offer)
        } catch (err) {
            console.error('ICE 重启失败:', err)
        }
    }

    /**
     * 将本地流中的所有轨道添加到指定连接
     * @param peer 连接实例
     * @param stream 本地媒体流
     */
    addStreamToConnection(peer: RTCPeerConnection, stream: MediaStream | null): void {
        if (!stream) {
            console.error('❌ 本地流为空，无法添加到PeerConnection')
            return
        }

        console.log('🎥 === 添加本地流到PeerConnection ===', {
            streamId: stream.id,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            totalTracks: stream.getTracks().length
        })

        // 将流中的每个轨道添加到 PeerConnection 中
        stream.getTracks().forEach(track => {
            console.log('添加轨道:', {
                kind: track.kind,
                enabled: track.enabled,
                id: track.id
            })
            peer.addTrack(track, stream)
        })

        console.log('✅ 本地流已添加到PeerConnection')
    }

    // ========================================== 模块二：轨道/媒体流控制 ==========================================
    /**
     * 获取媒体流（摄像头/麦克风或屏幕）
     * @param options 可选项：audio 是否采集音频、video 是否采集视频、screen 是否捕获屏幕
     * @returns 若成功返回 MediaStream，失败返回 null
     */
    async getMediaStream({
        audio = true,
        video = true,
        screen = false
    }: {
        audio?: boolean
        video?: boolean
        screen?: boolean
    } = {}): Promise<MediaStream | null> {
        try {
            if (screen) {
                // 获取屏幕共享流
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    audio,
                    video
                })
                return screenStream
            }

            // 获取本地媒体流
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio,
                video
            })
            return this.localStream
        } catch (error) {
            console.error('Error accessing media devices:', error)
            return null
        }
    }
    /**
     * 向所有连接添加指定类型轨道
     * @param kind 'audio' | 'video' 轨道类型
     * @param track MediaStreamTrack 需要添加的轨道
     * @description 会先检查每个 PeerConnection 是否已存在同类型轨道，若存在则不重复添加，若本地流不存在则直接返回
     */
    addTracks(kind: 'audio' | 'video', track: MediaStreamTrack) {
        if (!this.localStream) {
            console.error('本地流不存在，无法添加轨道')
            return
        }

        for (const peer of Object.values(this.peerConnections)) {
            // 检查当前 PeerConnection 是否已存在同类型轨道
            const senders = peer.getSenders()
            const hasSameKind = senders.some(
                sender => sender.track && sender.track.kind === kind && sender.track.id === track.id
            )
            if (!hasSameKind) {
                // 只添加未存在的轨道，避免重复添加
                peer.addTrack(track, this.localStream)
            }
        }
    }

    /**
     * 从所有连接中移除指定类型（audio/video）的发送轨道
     * @param kind 'audio' | 'video'
     */
    removeTracks(kind: 'audio' | 'video') {
        for (const peer of Object.values(this.peerConnections)) {
            // 获取当前 PeerConnection 的所有发送轨道
            const senders = peer.getSenders()
            // 过滤出类型为指定 kind 的 sender
            const targetSenders = senders.filter(s => s.track && s.track.kind === kind)
            // 移除所有目标 sender
            targetSenders.forEach(sender => {
                peer.removeTrack(sender)
            })
        }
    }

    /**
     * 替换本地轨道（音频或视频）到所有连接
     * 适用于切换麦克风/摄像头设备
     * @param kind 轨道类型：'audio' | 'video'
     * @param newTrack 新轨道
     */
    async replaceLocalTrack(kind: 'audio' | 'video', newTrack: MediaStreamTrack) {
        // 如果本地流不存在，则新建一个空流
        if (!this.localStream) {
            this.localStream = new MediaStream()
        }

        // 移除本地流中所有同类型的旧轨道
        const oldTracks = this.localStream.getTracks().filter(t => t.kind === kind)
        oldTracks.forEach(t => this.localStream && this.localStream.removeTrack(t))

        // 添加新的轨道到本地流
        this.localStream.addTrack(newTrack)

        // 遍历所有 PeerConnection，替换或添加新轨道
        for (const peer of Object.values(this.peerConnections)) {
            // 查找当前连接中同类型的 sender
            const sender = peer.getSenders().find(s => s.track && s.track.kind === kind)
            if (sender) {
                // 如果 sender 存在，直接替换轨道
                await sender.replaceTrack(newTrack)
                console.log(`已替换 ${kind} 轨道到连接 ${peer.connectionState}`)
            } else {
                // 如果 sender 不存在，直接添加新轨道
                peer.addTrack(newTrack, this.localStream)
                console.log(`已添加新的 ${kind} 轨道到连接 ${peer.connectionState}`)
            }
        }
    }

    /**
     * 以新的本地流整体替换所有连接中的音视频轨道
     * @param newStream 新的本地媒体流
     */
    async replaceLocalStream(newStream: MediaStream) {
        // 步骤1：更新本地流引用
        this.localStream = newStream

        // 步骤2：获取新流中的音频轨道和视频轨道（只取第一个）
        const newAudio = newStream.getAudioTracks()[0]
        const newVideo = newStream.getVideoTracks()[0]

        // 步骤3：遍历所有 PeerConnection，替换或添加轨道
        for (const peer of Object.values(this.peerConnections)) {
            const senders = peer.getSenders()
            // 查找音频和视频 sender
            const audioSender = senders.find(s => s.track && s.track.kind === 'audio')
            const videoSender = senders.find(s => s.track && s.track.kind === 'video')

            // 替换音频轨道
            if (audioSender && newAudio) {
                await audioSender.replaceTrack(newAudio)
            }
            // 替换视频轨道
            if (videoSender && newVideo) {
                await videoSender.replaceTrack(newVideo)
            }
            // 如果 sender 不存在，则添加新轨道
            if (!audioSender && newAudio) {
                peer.addTrack(newAudio, newStream)
            }
            if (!videoSender && newVideo) {
                peer.addTrack(newVideo, newStream)
            }
        }
    }

    /**
     * 停止并释放本地媒体流（停止所有轨道并置空引用）
     */
    stopLocalStream() {
        if (this.localStream) {
            // 遍历本地流中的所有轨道，逐个停止
            this.localStream.getTracks().forEach(track => track.stop())
            // 释放本地流对象
            this.localStream = null
        }
    }

    // ========================================== 模块三：关闭销毁管理 ==========================================

    /**
     * 关闭指定远端的连接并清理其远端流
     * @param remoteId 远端 ID
     */
    closeConnection(remoteId: RoomId) {
        console.log('=== 关闭指定远端的连接 ===', this.peerConnections)
        if (this.peerConnections && this.peerConnections[remoteId]) {
            this.peerConnections[remoteId].close()
            delete this.peerConnections[remoteId]
            delete this.remoteStreams[remoteId]
        }
    }

    /**
     * 关闭所有连接并清理远端流集合
     */
    closeAllConnections() {
        if (this.peerConnections) {
            Object.keys(this.peerConnections).forEach(remoteId => {
                this.closeConnection(remoteId)
            })
        }
    }

    /**
     * 本地流并关闭所有连接
     */
    cleanupCore() {
        this.stopLocalStream()
        this.closeAllConnections()
    }
}
