import { message } from 'ant-design-vue'
import { useMeetingStore } from '@/stores/meeting'
import { WebRTCManager } from '../core/webRTC'

// -------------------------------------调试工具类-------------------------------------
/**
 * 调试工具配置接口
 */
export interface DebugUtilsConfig {
    webRTCManager: WebRTCManager
    roomId: string
    userId: string
    signalingService: any
    videoManager: any
}

/**
 * 调试工具类
 * 提供各种调试功能
 */
export class DebugUtils {
    private meetingStore = useMeetingStore()
    private config: DebugUtilsConfig

    constructor(config: DebugUtilsConfig) {
        this.config = config
    }

    /**
     * 测试信令发送
     */
    testSignaling() {
        const testMessage = {
            type: 'offer' as const,
            roomId: this.config.roomId,
            userId: this.config.userId,
            timestamp: Date.now(),
            data: { action: 'test_message', message: 'Hello from ' + this.config.userId }
        }

        this.config.signalingService.send(testMessage)
        console.log('测试信令已发送:', testMessage)
    }

    /**
     * 强制更新主视频
     */
    forceUpdateMainVideo() {
        this.config.videoManager.bindMainVideo()
        console.log('主视频已强制更新')
    }

    /**
     * 测试 Store 状态更新
     */
    testStoreUpdate() {
        console.log('开始测试 Store 状态更新...')

        // 测试连接状态切换
        this.meetingStore.setConnected(!this.meetingStore.webRTCState.connected)
        console.log('连接状态已切换:', this.meetingStore.webRTCState.connected)

        // 测试麦克风状态切换
        this.meetingStore.toggleMic()
        console.log('麦克风状态已切换:', this.meetingStore.webRTCState.micOn)

        // 测试摄像头状态切换
        this.meetingStore.toggleCamera()
        console.log('摄像头状态已切换:', this.meetingStore.webRTCState.camOn)

        // 测试添加参与者
        const testParticipantId = `test_${Date.now()}`
        this.meetingStore.addParticipant({
            id: testParticipantId,
            name: '测试用户',
            hasVideo: true,
            hasAudio: true
        })
        console.log('测试参与者已添加:', testParticipantId)

        // 3秒后移除测试参与者
        setTimeout(() => {
            this.meetingStore.removeParticipant(testParticipantId)
            console.log('测试参与者已移除:', testParticipantId)
        }, 3000)
    }

    /**
     * 检查远程流状态
     */
    checkRemoteStreams() {
        const connectionCount = Object.keys(this.config.webRTCManager.peerConnections).length
        const streamCount = Object.keys(this.meetingStore.remoteStreams).length
        const participantList = this.meetingStore.participants.map(p => p.id)

        console.log('远程流状态检查:', {
            connectionCount,
            streamCount,
            participantList
        })
    }

    /**
     * 广播用户存在
     */
    broadcastUserPresence() {
        console.log(this.config.signalingService)
        this.config.signalingService.sendUserJoin()
        console.log('用户存在广播已发送')
    }
}

// -------------------------------------错误处理工具类-------------------------------------
/**
 * 错误处理工具类
 */
export class ErrorHandler {
    /**
     * 统一错误处理方法
     * @param error 错误对象
     * @param context 错误上下文
     * @param userMessage 用户友好的错误消息
     */
    static handle(error: any, context: string, userMessage?: string) {
        console.error(`${context}:`, error)
        message.error(userMessage || `${context}失败`)
    }

    /**
     * 处理 WebRTC 相关错误
     * @param error 错误对象
     * @param operation 操作名称
     */
    static handleWebRTCError(error: any, operation: string) {
        const errorMessages: Record<string, string> = {
            NotAllowedError: '设备权限被拒绝，请检查浏览器设置',
            NotFoundError: '未找到指定的设备',
            NotReadableError: '设备被其他应用占用',
            OverconstrainedError: '设备不支持指定的约束条件'
        }

        const userMessage = errorMessages[error.name] || `${operation}失败`
        this.handle(error, operation, userMessage)
    }
}
