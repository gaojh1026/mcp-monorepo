import { message } from 'ant-design-vue'
import { ErrorHandler } from './common-utils'
import { WebRTCManager } from '../core/webRTC'
import { useMeetingStore } from '@/stores/meeting'
import { SignalingManager } from '../core/socket/socket-manager'

/**
 * 操作方法配置接口
 */
export interface UseOperationConfig {
    webRTCManager: WebRTCManager
    roomId: string
    getLocalStream: () => Promise<void>
    signalingService: SignalingManager['signalingService']
}

/**
 * WebRTC 操作方法 hooks
 * 提供通话、设备控制、屏幕共享等核心操作功能
 * @param config 配置对象，包含状态管理、WebRTC管理器和房间ID
 * @returns 返回所有操作方法的集合
 */
export const useDeviceManage = ({
    webRTCManager,
    roomId,
    getLocalStream,
    signalingService
}: UseOperationConfig) => {
    const meetingStore = useMeetingStore()
    /**
     * 处理通话操作（开始/结束通话）
     * 整合了信令服务、状态管理和WebRTC核心操作
     * @param isStart 是否开始通话
     * @param callback 回调函数
     */
    const toggleCallAction = async (isStart: boolean, callback: (statue: boolean) => void) => {
        try {
            if (isStart) {
                // 开始通话 - 先准备本地流，然后向房间广播
                console.log('发起通话')
                await getLocalStream()
                meetingStore.setConnected(true)
                webRTCManager.callManager.startCall(roomId)
                message.info('已准备就绪，等待其他用户加入...')

                // 立即广播用户存在
                console.log('广播用户存在...')
                signalingService.sendUserJoin()

                // 请求房间信息，了解当前房间内的其他用户
                setTimeout(() => {
                    console.log('请求房间信息...')
                    // 房间信息请求已移除，简化信令服务
                }, 500)

                callback(true)
            } else {
                // 结束通话
                console.log('结束通话')
                webRTCManager.callManager.hangUpAll()
                meetingStore.setConnected(false)
                meetingStore.clearParticipants()

                // 广播用户离开
                signalingService.sendUserLeave()

                message.info('通话已结束')
                callback(false)
            }
        } catch (error) {
            console.error('通话操作失败:', error)
            ErrorHandler.handle(error, '通话操作')
            callback(false)
        }
    }

    /**
     * 切换麦克风状态
     * @param isOpen 是否开启麦克风
     * @param callback 回调函数
     */
    const toggleMic = (isOpen: boolean, callback: (statue: boolean) => void) => {
        try {
            const res = webRTCManager.deviceManager.toggleMic(isOpen)
            console.log('麦克风状态:', res, isOpen)
            const nextState = !isOpen
            callback(res ? isOpen : nextState)

            message.info(res ? '麦克风已开启' : '麦克风已静音')
        } catch (error) {
            ErrorHandler.handle(error, '麦克风切换')
        }
    }

    /**
     * 切换摄像头状态
     * 启用或禁用本地视频轨道，并更新视频显示
     * @param {boolean} isOpen 是否开启摄像头
     * @param {(statue: boolean) => void} callback 回调函数
     * @param {HTMLVideoElement | undefined | null} videoDom 视频容器节点
     * @returns {Promise<boolean>} 操作是否成功
     */
    const toggleCamera = async (
        isOpen: boolean,
        callback: (statue: boolean) => void,
        videoDom: HTMLVideoElement | undefined | null
    ): Promise<boolean> => {
        // /摄像头开启失败处理
        const onOpenFailed = (errorMsg: string) => {
            console.warn(errorMsg)
            // 通知信令
            signalingService.sendVideoStatus(false)
            callback(false)
            if (videoDom) videoDom.srcObject = null
        }

        try {
            // 校验视频渲染节点
            if (!videoDom) {
                console.error('未找到本地视频渲染节点')
                callback(false)
                return false
            }

            if (isOpen) {
                // 若本地流不存在则先获取
                if (!webRTCManager.localStream) {
                    await getLocalStream()
                }
                // 调用WebRTC管理器切换摄像头
                await webRTCManager.deviceManager.toggleCamera(true)
                const localStream = webRTCManager.getStream('local')

                if (!localStream) {
                    onOpenFailed('未能获取到本地视频流')
                    return false
                }

                const videoTracks = localStream.getVideoTracks()
                // 检查是否有可用的视频轨道
                const videoTrack = videoTracks.find(track => track.enabled)
                if (videoTrack) {
                    videoDom.srcObject = localStream
                    console.log('摄像头已开启，视频流已绑定')
                    // 发送视频状态变化通知
                    console.log('发送视频开启状态通知:', { enabled: true, trackId: videoTrack.id })
                    signalingService.sendVideoStatus(true, videoTrack.id)
                    callback(true)
                } else {
                    onOpenFailed('摄像头轨道未启用')
                    return false
                }
            } else {
                // 关闭摄像头逻辑
                await webRTCManager.deviceManager.toggleCamera(false)
                videoDom.srcObject = null
                // 发送信令，通知远端用户
                signalingService.sendVideoStatus(false)
                callback(false)
            }

            const msg = isOpen ? '摄像头已开启' : '摄像头已关闭'
            console.log(msg)
            message.info(msg)
            return true
        } catch (error) {
            ErrorHandler.handleWebRTCError(error, '摄像头切换')
            return false
        }
    }

    /**
     * 切换屏幕共享状态
     * @param isStart 是否开始屏幕共享
     * @param callback 回调函数
     */
    const toggleScreenShare = async (isStart: boolean, callback: (statue: boolean) => void) => {
        try {
            if (isStart) {
                // 开始屏幕共享
                const isSuccess = await webRTCManager.screenShareManager.startScreenSharing()
                if (!isSuccess) {
                    message.error('屏幕共享失败')
                    return
                }
                callback(true)
                message.success('开始屏幕共享')
            } else {
                // 停止屏幕共享
                await webRTCManager.screenShareManager.stopScreenSharing()
                callback(false)
                message.success('停止屏幕共享')
            }
        } catch (error) {
            ErrorHandler.handleWebRTCError(error, '屏幕共享操作')
        }
    }

    /**
     * 切换录制状态
     * @param isRecording 是否录制
     * @param streamType 录制流类型 'screen' | 'local'
     * @param callback 回调函数
     */
    const toggleRecord = async (
        isRecording: boolean,
        streamType: 'screen' | 'local',
        callback: (statue: boolean) => void
    ) => {
        try {
            if (isRecording) {
                // 开始录制
                await webRTCManager.recordingManager.startRecording(streamType)
                callback(true)
                message.success(`开始录制${streamType}流`)
            } else {
                // 停止录制
                await webRTCManager.recordingManager.stopRecording()
                callback(false)
                message.success('停止录制')
            }
        } catch (error) {
            ErrorHandler.handle(error, '录制操作')
        }
    }

    // 返回所有操作方法
    return {
        toggleCallAction,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        toggleRecord
    }
}
