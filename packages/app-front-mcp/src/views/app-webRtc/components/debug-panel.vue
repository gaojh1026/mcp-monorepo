<template>
    <!-- 调试面板 -->
    <div class="debug-panel">
        <ControlOutlined style="font-size: 20px" v-if="!showDebug" @click="onCloseDebug" />

        <div class="debug-panel__content" v-else>
            <h4>调试信息</h4>
            <p>当前用户ID: {{ currentUserId }}</p>
            <p>房间ID: {{ roomId }}</p>
            <p>连接状态: {{ connected ? '已连接' : '未连接' }}</p>
            <p>参与者数量: {{ participantCount }}</p>
            <p>参与者列表: {{ participantList.join(', ') }}</p>
            <p>信令服务器状态: {{ signalingState }}</p>
            <p>本地流状态: {{ hasLocalStream ? '已获取' : '未获取' }}</p>
            <p>远程流数量: {{ remoteStreamCount }}</p>
            <p>WebRTC连接数: {{ connectionCount }}</p>
            <hr style="margin: 10px 0; border: 1px solid #333" />
            <h5>Store 状态检查:</h5>
            <p>Store 连接状态: {{ connected ? '已连接' : '未连接' }}</p>
            <p>Store 麦克风状态: {{ micOn ? '开启' : '关闭' }}</p>
            <p>Store 摄像头状态: {{ camOn ? '开启' : '关闭' }}</p>
            <p>Store 参与者数量: {{ participantCount }}</p>
            <div style="margin-top: 10px">
                <button type="button" @click="handleBroadcastPresence" style="margin-right: 5px">
                    广播存在
                </button>
                <button type="button" @click="handleTestSignaling" style="margin-right: 5px">
                    测试信令
                </button>
                <button type="button" @click="handleCheckRemoteStreams" style="margin-right: 5px">
                    检查远程流
                </button>
                <button type="button" @click="handleForceUpdateMainVideo" style="margin-right: 5px">
                    强制更新主视频
                </button>
                <button type="button" @click="handleTestStoreUpdate" style="margin-right: 5px">
                    测试Store更新
                </button>
                <button type="button" @click="handleHideDebug">隐藏调试</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useMeetingStore } from '@/stores/meeting'
import { DebugUtils } from '../utils/common-utils'

/**
 * 组件属性接口
 */
interface Props {
    webRTCManager: any
    videoManager: any
    signalingManager: any
}

const props = defineProps<Props>()

const meetingStore = useMeetingStore()

/**
 * 调试工具实例
 * 用于在调试面板中触发各类辅助调试操作
 */
let debugUtils: DebugUtils | null = null

onMounted(() => {
    debugUtils = new DebugUtils({
        webRTCManager: props.webRTCManager,
        roomId: meetingStore.config.roomId,
        userId: meetingStore.config.userId,
        signalingService: props.signalingManager.signalingService,
        videoManager: props.videoManager
    })
})

// 组件卸载时清理引用
onUnmounted(() => {
    debugUtils = null
})

// ==================== 计算属性 ====================
const showDebug = computed(() => meetingStore.config.enableDebug)
const currentUserId = computed(() => meetingStore.config.userId)
const roomId = computed(() => meetingStore.config.roomId)
const connected = computed(() => meetingStore.webRTCState.connected)
const micOn = computed(() => meetingStore.webRTCState.micOn)
const camOn = computed(() => meetingStore.webRTCState.camOn)
const participantCount = computed(() => meetingStore.totalParticipantCount)
const participantList = computed(() =>
    Array.isArray(meetingStore.participants) ? meetingStore.participants.map(p => p.id) : []
)
const signalingState = computed(() => meetingStore.signalingState)
const hasLocalStream = computed(() => !!props.webRTCManager?.localStream)
const remoteStreamCount = computed(() =>
    meetingStore.remoteStreams ? Object.keys(meetingStore.remoteStreams).length : 0
)
const connectionCount = computed(() =>
    props.webRTCManager?.peerConnections
        ? Object.keys(props.webRTCManager.peerConnections).length
        : 0
)

/**
 * 切换调试面板显示
 */
const onCloseDebug = (): void => {
    meetingStore.toggleDebug(!showDebug.value)
}

// ==================== 事件处理 ====================
/**
 * 广播用户存在，用于联通性验证
 */
const handleBroadcastPresence = (): void => {
    debugUtils?.broadcastUserPresence()
}

/**
 * 发送测试信令，验证信令通道
 */
const handleTestSignaling = (): void => {
    debugUtils?.testSignaling()
}

/**
 * 检查远端媒体流的完整性
 */
const handleCheckRemoteStreams = (): void => {
    debugUtils?.checkRemoteStreams()
}

/**
 * 强制更新主视频区域的渲染
 */
const handleForceUpdateMainVideo = (): void => {
    debugUtils?.forceUpdateMainVideo()
}

/**
 * 测试对 Store 的写入与订阅是否正常
 */
const handleTestStoreUpdate = (): void => {
    debugUtils?.testStoreUpdate()
}

/**
 * 隐藏调试面板
 */
const handleHideDebug = (): void => {
    meetingStore.toggleDebug(false)
}
</script>

<style scoped lang="less">
.debug-panel {
    position: fixed;
    top: 80px;
    right: 20px;
    color: white;
    padding: 15px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 1000;
    border: 1px solid #333;

    &__content {
        width: 300px;
        background: rgba(0, 0, 0, 0.8);
    }

    h4 {
        margin: 0 0 10px 0;
        color: #4caf50;
    }

    p {
        margin: 5px 0;
        word-break: break-all;
    }

    button {
        background: #4caf50;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        transition: background-color 0.3s;

        &:hover {
            background: #45a049;
        }

        &:active {
            background: #3d8b40;
        }
    }
}
</style>
