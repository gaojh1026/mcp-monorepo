/** WebRTC 相关类型定义 */

import type { RoomId } from '../webrtc-core'

/** 录制状态与结果回调 */
export type RecordCallback = (data: { status: string; blob: Blob | null }) => void

/** 录制选项 */
export interface RecordingOptions {
    mimeType?: string
    videoBitsPerSecond?: number
    audioBitsPerSecond?: number
}

/** 屏幕共享配置 */
export interface ScreenShareConfig {
    screen?: boolean
    audio?: boolean
}

/** 设备控制选项 */
export interface DeviceControlOptions {
    audio?: boolean
    video?: boolean
}

/** 录制管理器接口 */
export interface IRecordingManager {
    startRecording(streamType: 'local' | 'screen'): Promise<boolean>
    pauseRecording(): Promise<boolean>
    resumeRecording(): Promise<boolean>
    stopRecording(): Promise<boolean>
    getRecordingStatus(): boolean
}

/** 屏幕共享管理器接口 */
export interface IScreenShareManager {
    startScreenSharing(config?: ScreenShareConfig): Promise<boolean>
    stopScreenSharing(): Promise<void>
    isScreenSharing(): boolean
}

/** 设备管理器接口 */
export interface IDeviceManager {
    openCamera(): Promise<boolean>
    closeCamera(): boolean
    toggleCamera(enabled: boolean): Promise<boolean>
    openMic(): boolean
    closeMic(): boolean
    toggleMic(enabled: boolean): boolean
}

/** 通话管理器接口 */
export interface ICallManager {
    startCall(remoteId: RoomId): Promise<void>
    answerCall(remoteId: RoomId, offer: RTCSessionDescriptionInit): Promise<void>
    hangUp(remoteId: RoomId): void
    hangUpAll(): void
}

/** 连接管理器接口 */
export interface IConnectionManager {
    addVideoTracksToAllConnections(): Promise<void>
    recreateAllConnections(): Promise<void>
    triggerRenegotiation(): Promise<void>
}

export type GetStream = (streamType: 'local' | 'screen') => MediaStream | undefined
