<template>
    <!-- 设备操作栏 -->
    <footer class="btn-operation">
        <div class="btn-operation__container">
            <!-- 音频 -->
            <a-tooltip :title="micOn ? '静音' : '解除静音'" placement="top">
                <a-button :type="micOn ? 'primary' : 'default'" shape="circle" @click="onToggleMic">
                    <AudioMutedOutlined v-if="!micOn" />
                    <AudioOutlined v-else />
                </a-button>
            </a-tooltip>
            <!-- 视频 -->
            <a-tooltip :title="camOn ? '关闭视频' : '开启视频'" placement="top">
                <a-button
                    :type="camOn ? 'primary' : 'default'"
                    shape="circle"
                    @click="onToggleCamera"
                >
                    <VideoCameraOutlined />
                </a-button>
            </a-tooltip>
            <!-- 屏幕共享 -->
            <a-tooltip :title="sharing ? '停止共享' : '共享屏幕'" placement="top">
                <a-button
                    :type="sharing ? 'primary' : 'default'"
                    shape="circle"
                    @click="onToggleScreenShare"
                >
                    <FundProjectionScreenOutlined />
                </a-button>
            </a-tooltip>
            <!-- 录制 -->
            <a-tooltip :title="recording ? '停止录制' : '开始录制'" placement="top">
                <a-button
                    :type="recording ? 'primary' : 'default'"
                    shape="circle"
                    @click="onToggleRecord"
                >
                    <!-- <ReconciliationOutlined /> -->
                    <v-icon name="bi-record-circle"></v-icon>
                    <SvgIcon name="ssorecord"></SvgIcon>
                </a-button>
            </a-tooltip>
            <!-- 通话 -->
            <a-tooltip :title="connected ? '结束通话' : '开始通话'" placement="top">
                <a-button type="primary" :danger="connected" shape="circle" @click="onCallAction">
                    <PhoneOutlined />
                </a-button>
            </a-tooltip>
        </div>
    </footer>
</template>

<script lang="ts" setup>
import { useMeetingStore } from '@/stores/meeting'
import { useDeviceManage } from '../utils/useDeviceManage'
import { WebRTCManager } from '../core/webRTC/index'
import { SignalingManager } from '../core/socket/socket-manager'
import { computed, h } from 'vue'

interface Props {
    webRTCManager: WebRTCManager
    getLocalStream: () => Promise<void>
    videoDom?: HTMLVideoElement
    signalingService: SignalingManager['signalingService']
}

const props = withDefaults(defineProps<Props>(), {})
const meetingStore = useMeetingStore()

const connected = computed(() => meetingStore.meetingStatusStore.webRTCState.connected) // 是否已连接
const micOn = computed(() => meetingStore.webRTCState.micOn) // 是否已开启麦克风
const camOn = computed(() => meetingStore.meetingStatusStore.webRTCState.camOn) // 是否已开启摄像头
const sharing = computed(() => meetingStore.meetingStatusStore.webRTCState.sharing) // 是否已开启屏幕共享
const recording = computed(() => meetingStore.meetingStatusStore.webRTCState.recording) // 是否已开启录制

/**
 * 使用设备管理 hooks
 */
const { toggleCallAction, toggleCamera, toggleScreenShare, toggleRecord, toggleMic } =
    useDeviceManage({
        webRTCManager: props.webRTCManager,
        roomId: meetingStore.meetingConfigStore.config.roomId,
        getLocalStream: props.getLocalStream,
        signalingService: props.signalingService
    })

/**
 * 处理通话操作
 * 使用优化后的 toggleCallAction 方法
 */
const onCallAction = async () => {
    const isStart = !meetingStore.meetingStatusStore.webRTCState.connected
    await toggleCallAction(isStart, (status: boolean) => {
        // 状态已由 toggleCallAction 内部管理，这里不需要额外处理
        console.log('通话状态更新:', status)
    })
}
/**
 * 切换摄像头
 */
const onToggleCamera = async () => {
    const newCamState = !meetingStore.meetingStatusStore.webRTCState.camOn
    await toggleCamera(
        newCamState,
        (status: boolean) => {
            meetingStore.meetingStatusStore.toggleCamera(status)
        },
        props.videoDom
    )
}

/**
 * 切换麦克风状态
 */
const onToggleMic = () => {
    const newMicState = !meetingStore.meetingStatusStore.webRTCState.micOn
    meetingStore.meetingStatusStore.toggleMic(newMicState)
    toggleMic(newMicState, (status: boolean) => {
        meetingStore.meetingStatusStore.toggleMic(status)
    })
}

/**
 * 切换屏幕共享状态
 */
const onToggleScreenShare = () => {
    const newSharingState = !meetingStore.meetingStatusStore.webRTCState.sharing
    meetingStore.meetingStatusStore.toggleScreenShare(newSharingState)
    toggleScreenShare(newSharingState, (status: boolean) => {
        meetingStore.meetingStatusStore.toggleScreenShare(status)
    })
}

/**
 * 切换录制状态
 */
const onToggleRecord = () => {
    const newRecordingState = !meetingStore.meetingStatusStore.webRTCState.recording
    meetingStore.meetingStatusStore.toggleRecording(newRecordingState)
    toggleRecord(
        newRecordingState,
        meetingStore.meetingStatusStore.webRTCState.sharing ? 'screen' : 'local',
        (status: boolean) => {
            meetingStore.meetingStatusStore.toggleRecording(status)
        }
    )
}
</script>

<style lang="less" scoped>
.btn-operation {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    z-index: 11;

    &__container {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 24px;
    }

    .ant-btn {
        width: 40px;
        height: 40px;
        margin: 0 8px;
    }
}
</style>
