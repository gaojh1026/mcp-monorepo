<template>
    <!-- 状态栏 -->
    <div class="status-header">
        <!-- 状态栏 -->
        <header class="status-header__container">
            <!-- 模块一：左侧信息 -->
            <div class="status-header__left">
                <!-- 房间信息 -->
                <div class="status-header__room">
                    <SvgIcon name="room" size="20px" class="status-header__room-icon" />
                    <div class="status-header__room-info">
                        <span class="status-header__room-label">房间号</span>
                        <span class="status-header__room-id">{{ roomId }}</span>
                    </div>
                </div>

                <!-- 连接状态 -->
                <div class="status-header__status">
                    <div
                        class="status-header__status-indicator"
                        :class="{ 'status-header__status-indicator--connected': connected }"
                    >
                        <div class="status-header__status-pulse" v-if="connected"></div>
                    </div>
                    <span class="status-header__status-text">{{
                        connected ? '已连接' : '未连接'
                    }}</span>
                </div>
            </div>

            <!-- 模块二：右侧操作 -->
            <div class="status-header__right">
                <a-tooltip title="复制邀请链接" placement="bottom">
                    <a-button type="text" @click="onCopyInvite" class="status-header__action">
                        <CopyOutlined />
                    </a-button>
                </a-tooltip>

                <a-tooltip title="设备设置" placement="bottom">
                    <a-button
                        type="text"
                        @click="deviceVisible = true"
                        class="status-header__action"
                    >
                        <SettingOutlined />
                    </a-button>
                </a-tooltip>

                <div class="status-header__user-count">
                    <span class="status-header__user-count-text">
                        当前房间用户数：<strong>{{ participantList.length + 1 }}</strong> 人
                    </span>
                </div>
            </div>
        </header>

        <!-- 弹窗：设置设备 -->
        <a-modal
            v-model:open="deviceVisible"
            title="设备设置"
            :width="420"
            :footer="null"
            class="status-header__modal"
        >
            <!-- 表单包含麦克风、摄像头、扬声器选择 -->
            <a-form layout="vertical" :model="{ selectedMic, selectedCam, selectedSpeaker }">
                <a-form-item label="麦克风设备">
                    <a-select
                        v-model:value="selectedMic"
                        :options="micOptions"
                        placeholder="请选择麦克风"
                        class="status-header__select"
                    />
                </a-form-item>
                <a-form-item label="摄像头设备">
                    <a-select
                        v-model:value="selectedCam"
                        :options="camOptions"
                        placeholder="请选择摄像头"
                        class="status-header__select"
                    />
                </a-form-item>
                <a-form-item label="音频输出设备">
                    <a-select
                        v-model:value="selectedSpeaker"
                        :options="speakerOptions"
                        placeholder="请选择扬声器"
                        class="status-header__select"
                    />
                </a-form-item>
                <a-form-item class="status-header__form-actions">
                    <a-space style="width: 100%; justify-content: flex-end">
                        <a-button @click="deviceVisible = false">取消</a-button>
                        <a-button type="primary" @click="onApplyDevices">应用设置</a-button>
                    </a-space>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { ErrorHandler } from '../utils/common-utils'
import { DeviceCore, type DeviceOption } from '../core/device/device-core'
import { useMeetingStore } from '@/stores/meeting'

// 从 store 获取状态
const meetingStore = useMeetingStore()
const roomId = computed(() => meetingStore.meetingConfigStore.config.roomId)
const connected = computed(() => meetingStore.meetingStatusStore.webRTCState.connected)
const participantList = computed(() => meetingStore.meetingStatusStore.participants.map(p => p.id))

/**
 * 组件事件接口
 */
const emit = defineEmits<{
    deviceChange: [stream: MediaStream]
}>()

/** 模块一：设备管理器 */
const deviceManager = new DeviceCore({
    onDeviceChange: async (stream: MediaStream) => {
        emit('deviceChange', stream)
    }
})

const micOptions = ref<DeviceOption[]>([]) // 麦克风设备列表
const camOptions = ref<DeviceOption[]>([]) // 摄像头设备列表
const speakerOptions = ref<DeviceOption[]>([]) // 扬声器设备列表
const selectedMic = ref<string>() // 选中的麦克风设备ID
const selectedCam = ref<string>() // 选中的摄像头设备ID
const selectedSpeaker = ref<string>() // 选中的扬声器设备ID

/**
 * 加载音频和视频设备列表
 */
const loadDevices = async () => {
    try {
        const {
            micOptions: mics,
            camOptions: cams,
            speakerOptions: speakers
        } = await deviceManager.getDevicesList()

        micOptions.value = mics
        camOptions.value = cams
        speakerOptions.value = speakers

        // 设置默认设备
        if (micOptions.value.length > 0 && !selectedMic.value) {
            selectedMic.value = micOptions.value[0].value
        }
        if (camOptions.value.length > 0 && !selectedCam.value) {
            selectedCam.value = camOptions.value[0].value
        }
        if (speakerOptions.value.length > 0 && !selectedSpeaker.value) {
            selectedSpeaker.value = speakerOptions.value[0].value
        }
    } catch (error) {
        ErrorHandler.handle(error, '加载设备列表')
    }
}

/** 模块二：复制/设置设备 */
const deviceVisible = ref(false)

/**
 * 复制邀请链接到剪贴板
 */
const onCopyInvite = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('roomId', roomId.value)

    navigator.clipboard
        .writeText(url.toString())
        .then(() => {
            message.success('邀请链接已复制到剪贴板')
        })
        .catch(() => {
            message.error('复制失败，请手动复制链接')
        })
}

/**
 * 应用设备设置并触发设备变化事件
 */
const onApplyDevices = async () => {
    try {
        // 应用设备设置
        await deviceManager.applyDevices({
            selectedMic: selectedMic.value,
            selectedCam: selectedCam.value,
            selectedSpeaker: selectedSpeaker.value
        })

        deviceVisible.value = false
        message.success('设备设置已应用')
    } catch (error) {
        ErrorHandler.handle(error, '应用设备设置')
    }
}

const clearDeviceManager = () => {
    try {
        deviceManager.destroy()
    } catch (error) {
        console.error('清理设备管理器失败:', error)
    }
}

onMounted(() => {
    loadDevices()
})
onBeforeUnmount(() => {
    clearDeviceManager()
})
</script>

<style lang="less" scoped>
.status-header {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    color: #f8fafc;
    width: 100%;

    &__container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        margin: 0 12px;
        background: rgba(0, 0, 0, 0.08);
        backdrop-filter: saturate(120%) blur(8px);
        -webkit-backdrop-filter: saturate(120%) blur(8px);
        border: 1px solid rgba(208, 191, 191, 0.18);
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(145, 143, 143, 0.18);
    }

    &__left {
        display: flex;
        align-items: center;
        gap: 24px;
    }

    &__right {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #f8fafc;
    }

    &__user-count {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 18px;
        transition: all 0.3s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        &-icon {
            opacity: 0.9;
        }

        &-text {
            font-size: 13px;
            color: #f8fafc;
            font-weight: 500;

            strong {
                font-weight: 700;
            }
        }
    }

    // 房间信息
    &__room {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        font-size: 12px;

        &:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        &-icon {
            color: #69b1ff;
            opacity: 0.95;
        }

        &-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        &-label {
            color: rgba(255, 255, 255, 0.75);
            font-weight: 500;
        }

        &-id {
            font-weight: 600;
            color: #e6f4ff;
        }
    }

    // 连接状态
    &__status {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        transition: all 0.3s ease;

        &-indicator {
            position: relative;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ff4d4f;
            box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
            transition: all 0.3s ease;

            &--connected {
                background: #52c41a;
                box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.2);
            }
        }

        &-text {
            font-size: 12px;
            font-weight: 500;
            color: #f8fafc;
            letter-spacing: 0.3px;
        }
    }

    // 操作按钮
    &__action {
        color: #fff;
        padding: 4px 8px;

        &:hover {
            color: #52c41a;
        }
    }
}
</style>
