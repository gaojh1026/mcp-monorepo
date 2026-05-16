/** 通话管理模块 */

import type { RoomId } from '../webrtc-core'
import type { ICallManager } from '../types'

/** 通话所需依赖 */
export interface CallDeps {
    getMediaStream: () => Promise<MediaStream | null>
    createDataChannel: (remoteId: RoomId, label: string, options: any) => void
    createOffer: (remoteId: RoomId) => Promise<void>
    createAnswer: (remoteId: RoomId, offer: RTCSessionDescriptionInit) => Promise<void>
    closeConnection: (remoteId: RoomId) => void
    closeAllConnections: () => void
}

/**
 * 通话管理器
 * 负责处理通话的发起、接听和挂断
 */
export class CallManager implements ICallManager {
    private deps: CallDeps

    constructor(deps: CallDeps) {
        this.deps = deps
    }

    /**
     * 开始通话（先获取本地流，再发起 offer）
     * @param remoteId 远端 ID
     */
    async startCall(remoteId: RoomId): Promise<void> {
        console.log('=== 开始通话 ===', { remoteId })
        // 获取媒体流、创建数据通道、创建offer
        await this.deps.getMediaStream()
        // 发起侧在媒体流就绪后创建数据通道
        // this.deps.createDataChannel(remoteId, 'data', { ordered: true })
        await this.deps.createOffer(remoteId)
    }

    /**
     * 接听通话（获取本地流后，创建并发送 answer）
     * @param remoteId 远端 ID
     * @param offer 对方的 offer
     */
    async answerCall(remoteId: RoomId, offer: RTCSessionDescriptionInit): Promise<void> {
        console.log('=== 接听通话 ===', { remoteId })

        try {
            await this.deps.getMediaStream()
            console.log('✅ 本地流准备完成')

            console.log('🔄 开始创建 Answer...')
            await this.deps.createAnswer(remoteId, offer)
            console.log('✅ Answer 创建并发送完成')
        } catch (error) {
            console.error('❌ 接听对话失败:', error)
            throw error
        }
    }

    /**
     * 挂断与指定远端的通话
     * @param remoteId 远端 ID
     */
    hangUp(remoteId: RoomId): void {
        this.deps.closeConnection(remoteId)
    }

    /** 挂断所有通话（关闭全部连接） */
    hangUpAll(): void {
        this.deps.closeAllConnections()
    }
}
