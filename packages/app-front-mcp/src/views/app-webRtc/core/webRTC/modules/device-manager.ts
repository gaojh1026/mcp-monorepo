/** 设备控制管理器 */

import type { IDeviceManager, DeviceControlOptions, GetStream } from '../types'

/** 设备管理所需依赖 */
export interface DeviceDeps {
    getStream: GetStream
    getMediaStream: (options: DeviceControlOptions) => Promise<MediaStream | null>
    addVideoTracksToAllConnections: () => Promise<void>
    removeTracks: (kind: 'audio' | 'video') => void
    triggerRenegotiation: () => Promise<void>
}

/**
 * 设备管理器
 * 负责处理摄像头和麦克风的控制
 */
export class DeviceManager implements IDeviceManager {
    private deps: DeviceDeps

    constructor(deps: DeviceDeps) {
        this.deps = deps
    }

    /**
     * 关闭摄像头（禁用本地视频轨道）
     * @returns boolean
     */
    closeCamera(): boolean {
        try {
            const localStream = this.getLocalStream()
            if (!localStream) {
                console.warn('本地流不存在，无需关闭摄像头')
                return false
            }

            const videoTracks = localStream.getVideoTracks()
            if (videoTracks.length === 0) {
                console.warn('未找到视频轨道，无需关闭摄像头')
                return false
            }

            // 禁用所有视频轨道
            videoTracks.forEach(track => {
                track.enabled = false
            })

            // 仅禁用轨道，不从连接中移除 sender，避免后续无法恢复发送
            // 这样远端仍保留同一条 m-line，重新开启时无需新增 sender 即可恢复
            return videoTracks.every(track => !track.enabled)
        } catch (error) {
            console.error('关闭摄像头失败:', error)
            throw error
        }
    }

    /**
     * 开启摄像头（启用现有视频轨道或获取新视频轨道并分发）
     * @returns Promise<void>
     */
    async openCamera(): Promise<boolean> {
        try {
            console.log('=== 开启摄像头 ===')

            const localStream = this.getLocalStream()
            const videoTracks = localStream?.getVideoTracks() || []

            // 如果本地流存在且有视频轨道，直接启用
            if (videoTracks.length > 0) {
                console.log(`找到 ${videoTracks.length} 个视频轨道，启用它们`)
                videoTracks.forEach(track => {
                    track.enabled = true
                })
                this.deps.addVideoTracksToAllConnections()
                console.log('摄像头已重新启用，视频轨道已添加到所有连接')
                return true
            }

            // 获取新的视频轨道
            const videoStream = await this.deps.getMediaStream({
                audio: false,
                video: true
            })
            if (!videoStream) {
                throw new Error('无法获取视频流')
            }

            const videoTrack = videoStream.getVideoTracks()[0]
            if (!videoTrack) {
                throw new Error('未找到视频轨道')
            }

            // 如果本地流存在，添加视频轨道；否则创建新流
            if (localStream) {
                console.log('本地流中无视频轨道，添加新的视频轨道')
                localStream.addTrack(videoTrack)
                console.log(`新视频轨道已添加到本地流: ${videoTrack.id}`)
            } else {
                console.log('本地流不存在，创建新的媒体流')
                const newStream = new MediaStream()
                newStream.addTrack(videoTrack)
                console.log(`新视频轨道已添加到本地流: ${videoTrack.id}`)
            }

            this.deps.addVideoTracksToAllConnections()
            console.log('视频轨道已同步到所有连接')
            return true
        } catch (error) {
            console.error('开启摄像头失败:', error)
            throw error
        }
    }

    /**
     * 切换摄像头状态
     * @param enabled true 开启 / false 关闭
     */
    async toggleCamera(enabled: boolean): Promise<boolean> {
        return enabled ? await this.openCamera() : this.closeCamera()
    }

    // -------------------------------------------------- 麦克风控制 --------------------------------------------------
    /**
     * 开启麦克风：优先启用现有音轨；若无音轨可选：尝试获取并添加
     */
    openMic(): boolean {
        console.log('=== 开启麦克风 ===')
        const localStream = this.getLocalStream()

        if (!localStream) {
            console.warn('本地流不存在，无需开启麦克风')
            return false
        }
        const audioTracks = localStream.getAudioTracks()
        if (audioTracks.length === 0) {
            console.warn('本地流无音频轨道，无法开启麦克风')
            return false // 或在此发起 getUserMedia 添加音轨
        }
        audioTracks.forEach(track => (track.enabled = true))
        return audioTracks.every(track => track.enabled)
    }

    /**
     * 关闭麦克风
     */
    closeMic(): boolean {
        console.log('=== 关闭麦克风 ===')
        const localStream = this.getLocalStream()
        if (!localStream) {
            console.warn('本地流不存在，无需关闭麦克风')
            return false
        }
        const audioTracks = localStream.getAudioTracks()
        if (audioTracks.length === 0) {
            console.warn('本地流无音频轨道，已视为关闭')
            return true
        }
        audioTracks.forEach(track => (track.enabled = false))
        return audioTracks.every(track => !track.enabled)
    }

    /**
     * 设定麦克风开关
     */
    toggleMic(enabled: boolean): boolean {
        return enabled ? this.openMic() : this.closeMic()
    }

    /**
     * 获取本地流
     * @returns 本地流
     */
    getLocalStream(): MediaStream | undefined {
        return this.deps.getStream('local')
    }
}
