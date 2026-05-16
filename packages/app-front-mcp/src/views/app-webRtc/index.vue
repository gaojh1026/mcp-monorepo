<template>
    <div class="app-webRTC">
        <!-- 顶部状态栏 -->
        <StatusHeader @device-change="handleDeviceChange" />
        <!-- 主视频区域 -->
        <VideoContainer ref="videoContainerRef" @set-remote-ref="handleSetRemoteRef" />
        <!-- 底部控制栏 -->
        <BtnOperation
            :webRTCManager="webRTCManager"
            :getLocalStream="getLocalStream"
            :videoDom="videoContainerRef?.localRef || undefined"
            :signalingService="signalingManager.signalingService"
        />
        <!-- 聊天面板 -->
        <ChatPanel :signalingManager="signalingManager" />
        <!-- 调试面板 -->
        <!-- <DebugPanel
      :webRTCManager="webRTCManager"
      :videoManager="videoManager"
      :signalingManager="signalingManager"
    /> -->
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, watchEffect, nextTick, computed } from 'vue'
// 组件
import StatusHeader from './components/status-header.vue'
import BtnOperation from './components/btn-operation.vue'
import VideoContainer from './components/video-container.vue'
import DebugPanel from './components/debug-panel.vue'
import ChatPanel from './components/chat-panel.vue'
import { message } from 'ant-design-vue'
// 方法常量
import { WebRTCManager } from './core/webRTC/index'
import { useRoute } from 'vue-router'
import { ErrorHandler } from './utils/common-utils'
// Store
import { useMeetingStore } from '@/stores/meeting'
// 管理器
import { SignalingManager } from './core/socket/socket-manager'
import { VideoManager } from './utils/video-manager'
import { AudioManager } from './core/audio-core'
import { DeviceCore } from './core/device/device-core'

const route = useRoute()
const meetingStore = useMeetingStore()

/** 模块一：初始化会议配置 */
const roomId = String(route.query.roomId || 'room-demo')
const currentUserId = String(
    route.query.userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
)
const currentUserName = String(route.query.userName || `小明_${currentUserId.slice(-6)}`)

// 设置会议配置
meetingStore.meetingConfigStore.setRoomId(roomId)
meetingStore.meetingConfigStore.setUserId(currentUserId)
meetingStore.meetingConfigStore.setUserName(currentUserName)

const videoContainerRef = ref<InstanceType<typeof VideoContainer> | null>(null)

/** 模块：初始化管理器 */

// ========================== 模块：webRTC管理器 ==========================
// 创建 webRTC 管理器
const webRTCManager = new WebRTCManager({ roomId })

// ========================== 模块：视频管理器 ==========================
// 创建视频管理器
const videoManager = new VideoManager({
    webRTCManager,
    dom: {
        mainVideoDom: () => {
            return videoContainerRef.value?.mainRef
        },
        localVideoDom: () => {
            return videoContainerRef.value?.localRef
        }
    }
})
/**
 * 获取本地流
 */
const getLocalStream = async () => {
    await videoManager.getLocalStream()
}
/**
 * 设置远程视频引用
 */
const handleSetRemoteRef = (participantId: string) => {
    videoManager?.setRemoteRef(participantId)
}

// ========================== 模块：音频管理器 ==========================
// 创建音频管理器
const audioManager = new AudioManager()

// ========================== 模块：设备管理器 ==========================
/**
 * 处理设备变化
 */
const handleDeviceChange = async (stream: MediaStream) => {
    try {
        await webRTCManager.replaceLocalStream(stream)
        if (videoContainerRef.value?.localRef) {
            videoContainerRef.value.localRef.srcObject = stream
        }
        message.success('设备已切换')
    } catch (error) {
        ErrorHandler.handleWebRTCError(error, '设备切换')
    }
}
/**
 * 处理设备列表变化
 */
const handleDeviceListChange = (devices: MediaDeviceInfo[]) => {
    console.log('设备列表已更新:', devices.length, '个设备')
}

// 创建设备管理器
const deviceManager = new DeviceCore({
    onDeviceChange: handleDeviceChange,
    onDeviceListChange: handleDeviceListChange
})

// ========================== 模块：信令管理器 ==========================
// 创建信令管理器
const signalingManager = new SignalingManager({
    roomId,
    userId: currentUserId,
    serverUrl: meetingStore.meetingConfigStore.config.serverUrl,
    webRTCManager,
    getLocalStream,
    currentUserId: currentUserId,
    videoManager
})

/** 模块二：初始化 */
/**
 * 初始化应用
 */
const initializeApp = async () => {
    try {
        // 获取本地流
        await videoManager.getLocalStream()
        meetingStore.meetingStatusStore.setConnected(true)
        videoManager.bindMainVideo()

        // 广播用户存在
        signalingManager.broadcastUserPresence()
        // 设置定期检查主视频状态
        setupMainVideoCheck()

        // 添加欢迎消息
        meetingStore.chatStore.addChatMessage({
            id: `system_${Date.now()}`,
            userId: 'system',
            userName: '系统',
            content: '欢迎进入会议！您可以在聊天中与其他参与者交流。',
            timestamp: Date.now(),
            type: 'system',
            isLocal: false
        })
    } catch (error) {
        message.error('初始化失败: ' + (error as Error).message)
    }
}

/**
 * 设置主视频状态定期检查
 */
const setupMainVideoCheck = () => {
    const mainVideoCheckInterval = setInterval(() => {
        if (videoContainerRef.value?.mainRef && !videoContainerRef.value.mainRef.srcObject) {
            videoManager.bindMainVideo()
        }
    }, 2000)

    // 在组件卸载时清理定时器
    onBeforeUnmount(() => {
        clearInterval(mainVideoCheckInterval)
    })
}

/**
 * 清理应用资源
 */
const cleanupApp = () => {
    try {
        // 广播用户离开
        if (meetingStore.meetingStatusStore.webRTCState.connected) {
            signalingManager.broadcastUserLeave()
        }
        // 关闭信令服务
        signalingManager.close()
        // 销毁音频分析器
        audioManager.destroy()
        // 清理设备管理器
        deviceManager.destroy()
        // 清理 WebRTC 资源
        webRTCManager.cleanup()
        // 重置 store 状态
        meetingStore.reset()
    } catch (error) {
        console.error('清理资源失败:', error)
    }
}

onMounted(async () => {
    await initializeApp()
})
onBeforeUnmount(() => {
    cleanupApp()
})

// ==================== 响应式更新 ====================
/**
 * 监听状态变化，自动更新主视频画面
 */
watchEffect(() => {
    void meetingStore.meetingStatusStore.webRTCState.activeSpeakerId
    void Object.keys(meetingStore.meetingStatusStore.remoteStreams).length
    void meetingStore.meetingStatusStore.webRTCState.connected

    if (meetingStore.meetingStatusStore.webRTCState.connected) {
        nextTick(() => {
            videoManager.bindMainVideo()
        })
    }
})

/**
 * 监听摄像头状态变化，更新本地视频显示
 */
watchEffect(() => {
    if (videoContainerRef.value?.localRef && webRTCManager.localStream) {
        const videoTracks = (webRTCManager.localStream as MediaStream).getVideoTracks()
        const hasEnabledVideo = videoTracks.length > 0 && videoTracks[0]?.enabled

        if (meetingStore.webRTCState.camOn && hasEnabledVideo) {
            videoContainerRef.value.localRef.srcObject = webRTCManager.localStream
        } else if (!meetingStore.webRTCState.camOn) {
            videoContainerRef.value.localRef.srcObject = null
        }
    }
})
</script>

<style scoped lang="less">
.app-webRTC {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
}
</style>
