/** WebRTC- 管理器（主要进行业务处理,基于CoreWebRTC进行封装） */

// -------------------------------------------------- 类型定义 --------------------------------------------------

import { CoreWebRTC, type RoomId, type WebRTCConfig } from './webrtc-core'
import type { GetStream, RecordingOptions } from './types'
// 功能管理器
import { RecordingManager } from './modules/recording-manager'
import { ScreenShareManager } from './modules/screen-share-manager'
import { DeviceManager } from './modules/device-manager'
import { CallManager } from './modules/call-manager'

/** WebRTC管理器配置 */
export interface WebRTCManagerConfig extends WebRTCConfig {
    recordingOptions?: RecordingOptions // 录制选项
    onRecord?: (blob: Blob | null) => void // 录制回调
}

// -------------------------------------------------- WebRTC业务处理（基于WebRTC核心管理类）--------------------------------------------------

/**
 * WebRTC管理器(主要进行业务处理,基于CoreWebRTC进行封装)
 */
export class WebRTCManager extends CoreWebRTC {
    /** 录制管理器 */
    recordingManager: RecordingManager
    /** 屏幕共享管理器 */
    screenShareManager: ScreenShareManager
    /** 设备管理器 */
    deviceManager: DeviceManager
    /** 通话管理器 */
    callManager: CallManager

    constructor(config: WebRTCManagerConfig) {
        super(config)

        // 创建通话管理器
        this.callManager = new CallManager({
            getMediaStream: this.getMediaStream.bind(this),
            createDataChannel: this.createDataChannel.bind(this),
            createOffer: this.createOffer.bind(this),
            createAnswer: this.createAnswer.bind(this),
            closeConnection: this.closeConnection.bind(this),
            closeAllConnections: this.closeAllConnections.bind(this)
        })
        // 创建设备管理器
        this.deviceManager = new DeviceManager({
            getStream: streamType => this.getStream(streamType) || undefined,
            getMediaStream: this.getMediaStream.bind(this),
            addVideoTracksToAllConnections: this.addVideoTracksToAllConnections.bind(this),
            removeTracks: this.removeTracks.bind(this),
            triggerRenegotiation: () => this.triggerRenegotiation()
        })
        // 创建录制管理器
        this.recordingManager = new RecordingManager({
            getStream: streamType => this.getStream(streamType) || undefined,
            recordingOptions: config.recordingOptions || {}
        })
        // 创建屏幕共享管理器
        this.screenShareManager = new ScreenShareManager({
            getStream: streamType => this.getStream(streamType) || undefined,
            getMediaStream: this.getMediaStream.bind(this),
            replaceTrack: track => this.replaceVideoTrackToPeers(this.peerConnections, track),
            addTrack: (track, stream) => this.addVideoTrackToPeers(stream, track)
        })
    }

    // =============================== 业务 ===============================
    /**
     * 获取指定类型的流
     * @param streamType 'local' | 'screen'，默认为 'local'
     * @returns MediaStream | undefined
     */
    getStream(streamType: 'local' | 'screen' = 'local') {
        if (streamType === 'local') {
            return this.localStream
        } else if (streamType === 'screen') {
            return this.screenStream
        }
    }

    /**
     * 将给定视频轨道替换到所有远程rtc连接 (用于屏幕共享)
     */
    async replaceVideoTrackToPeers(
        peers: Record<string | number, RTCPeerConnection>,
        track: MediaStreamTrack
    ): Promise<void> {
        for (const peer of Object.values(peers)) {
            const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video')
            if (sender) {
                await sender.replaceTrack(track)
            } else if (this.localStream) {
                peer.addTrack(track, this.localStream)
            }
        }
    }

    /**
     * 向所有远程rtc连接添加视频轨道 (用于屏幕共享)
     */
    addVideoTrackToPeers(stream: MediaStream, track: MediaStreamTrack): void {
        for (const peer of Object.values(this.peerConnections)) {
            peer.addTrack(track, stream)
        }
    }

    // ================================= 业务：连接管理 ===================================

    /**
     * 将本地视频轨道添加或替换到所有连接，并触发重新协商
     * @returns
     */
    async addVideoTracksToAllConnections(): Promise<void> {
        try {
            console.log('开始将视频轨道添加到所有连接...')

            if (!this.localStream) {
                console.warn('本地流不存在，无法添加视频轨道')
                return
            }

            const videoTracks = this.localStream.getVideoTracks()
            if (videoTracks.length === 0) {
                console.warn('本地流中没有视频轨道')
                return
            }

            const videoTrack = videoTracks[0]
            const connectionCount = Object.keys(this.peerConnections).length
            console.log(`需要向 ${connectionCount} 个连接添加视频轨道`)

            for (const [remoteId, peer] of Object.entries(this.peerConnections)) {
                try {
                    console.log(`处理连接 ${remoteId}, 状态: ${peer.connectionState}`)

                    if (
                        peer.connectionState === 'connected' ||
                        peer.connectionState === 'connecting'
                    ) {
                        const existingVideoSender = peer
                            .getSenders()
                            .find(s => s.track && s.track.kind === 'video')

                        if (existingVideoSender) {
                            await existingVideoSender.replaceTrack(videoTrack)
                            console.log(`已替换连接 ${remoteId} 的视频轨道`)
                        } else {
                            peer.addTrack(videoTrack, this.localStream)
                            console.log(`已添加视频轨道到连接 ${remoteId}`)
                        }
                    } else {
                        console.log(`跳过连接 ${remoteId}，状态: ${peer.connectionState}`)
                    }
                } catch (error) {
                    console.error(`为连接 ${remoteId} 添加视频轨道失败:`, error)
                }
            }

            await this.triggerRenegotiation()
            console.log('视频轨道已添加到所有连接')
        } catch (error) {
            console.error('添加视频轨道到所有连接失败:', error)
        }
    }

    /**
     * 重新创建所有已存在连接（先关闭再对每个远端重新发起 offer）
     * @returns
     */
    async recreateAllConnections(): Promise<void> {
        try {
            console.log('开始重新创建所有连接...')

            const existingConnections = Object.keys(this.peerConnections)
            console.log(`需要重新创建 ${existingConnections.length} 个连接`)

            // 先关闭所有连接
            for (const remoteId of existingConnections) {
                this.closeConnectionInternal(remoteId)
                console.log(`已关闭连接 ${remoteId}`)
            }

            await new Promise(resolve => setTimeout(resolve, 100))

            // 重新创建连接
            for (const remoteId of existingConnections) {
                try {
                    await this.createOffer(remoteId)
                    console.log(`已重新创建连接 ${remoteId}`)
                } catch (error) {
                    console.error(`重新创建连接 ${remoteId} 失败:`, error)
                }
            }

            console.log('所有连接重新创建完成')
        } catch (error) {
            console.error('重新创建连接失败:', error)
        }
    }

    /**
     * 触发所有连接的重新协商（为每个连接创建新 offer 并发送）
     * @returns
     */
    async triggerRenegotiation(): Promise<void> {
        try {
            console.log('开始触发重新协商...')
            const connectionCount = Object.keys(this.peerConnections).length
            console.log(`当前有 ${connectionCount} 个连接`)

            for (const [remoteId, peer] of Object.entries(this.peerConnections)) {
                console.log(`处理连接 ${remoteId}, 状态: ${peer.connectionState}`)

                if (peer.connectionState === 'connected' || peer.connectionState === 'connecting') {
                    try {
                        const offer = await peer.createOffer()
                        console.log(`为 ${remoteId} 创建 offer 成功`)

                        await peer.setLocalDescription(offer)
                        console.log(`为 ${remoteId} 设置本地描述成功`)

                        this.onSendSignal(remoteId, offer)
                        console.log(`已发送重新协商 offer 给 ${remoteId}`)
                    } catch (error) {
                        console.error(`为 ${remoteId} 创建 offer 失败:`, error)
                    }
                } else {
                    console.log(`跳过 ${remoteId}，连接状态: ${peer.connectionState}`)
                }
            }

            console.log('重新协商触发完成')
        } catch (error) {
            console.error('触发重新协商失败:', error)
        }
    }

    /**
     * 关闭指定连接（内部使用）
     * @param remoteId 远端 ID
     */
    private closeConnectionInternal(remoteId: RoomId): void {
        if (this.peerConnections[remoteId]) {
            this.peerConnections[remoteId].close()
            delete this.peerConnections[remoteId]
        }
    }

    // ================================= 业务：资源清理 ===================================

    /**
     * 停止录制/屏幕共享/本地流并关闭所有连接
     * @returns
     */
    cleanup(): void {
        this.recordingManager.stopRecording()
        this.screenShareManager.stopScreenSharing()
        // 清理核心
        this.cleanupCore()
    }
}
