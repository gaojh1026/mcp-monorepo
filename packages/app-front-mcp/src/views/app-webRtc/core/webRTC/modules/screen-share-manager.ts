/** 屏幕共享功能管理器 */

import type { GetStream, IScreenShareManager, ScreenShareConfig } from '../types'

/** 屏幕共享所需依赖 */
export interface ScreenShareDeps {
    getStream: GetStream
    getMediaStream: (config: any) => Promise<MediaStream | null>
    replaceTrack: (track: MediaStreamTrack) => Promise<void>
    addTrack: (track: MediaStreamTrack, stream: MediaStream) => void
}

/**
 * 屏幕共享管理器
 * 负责处理屏幕共享相关功能
 */
export class ScreenShareManager implements IScreenShareManager {
    /** 屏幕共享流 */
    private screenStream: MediaStream | null = null
    /** 屏幕分享前的视频轨道（用于恢复） */
    private previousVideoTrack: MediaStreamTrack | null = null
    /** 依赖集合 */
    private deps: ScreenShareDeps

    constructor(deps: ScreenShareDeps) {
        this.deps = deps
    }

    /**
     * 开始屏幕共享（仅视频，不采集屏幕音频）
     * @param config 屏幕共享配置
     * @returns
     */
    async startScreenSharing(
        config: ScreenShareConfig = { screen: true, audio: true }
    ): Promise<boolean> {
        try {
            const screen = await this.deps.getMediaStream(config)
            if (!screen) throw new Error('屏幕共享失败：未获取到屏幕流')

            const screenVideoTrack = screen.getVideoTracks()[0]
            if (!screenVideoTrack) throw new Error('屏幕共享失败：未发现视频轨道')

            this.screenStream = screen
            this.previousVideoTrack = this.deps.getStream('local')?.getVideoTracks()[0] || null

            // 替换视频轨道
            await this.deps.replaceTrack(screenVideoTrack)

            // 监听屏幕共享结束事件
            screenVideoTrack.onended = () => {
                this.stopScreenSharing().catch(() => {})
            }

            return true
        } catch (error) {
            console.error('启动屏幕分享失败:', error)
            return false
        }
    }

    /**
     * 停止屏幕共享并恢复原有本地视频轨道
     * @returns
     */
    async stopScreenSharing(): Promise<void> {
        if (!this.screenStream && !this.previousVideoTrack) {
            console.warn('屏幕流不存在，无需停止屏幕分享')
            return
        }

        // 停止屏幕流
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop())
            this.screenStream = null
        }

        // 恢复本地视频轨道
        const localVideoTrack =
            this.previousVideoTrack || this.deps.getStream('local')?.getVideoTracks()[0]
        if (localVideoTrack) {
            await this.deps.replaceTrack(localVideoTrack)
        }

        this.previousVideoTrack = null
    }

    /**
     * 检查是否正在屏幕共享
     * @returns
     */
    isScreenSharing(): boolean {
        return this.screenStream !== null
    }
}
