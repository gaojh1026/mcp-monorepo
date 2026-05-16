<template>
    <!-- 视频展示 -->
    <main class="video-container">
        <!-- 主视频画面 -->
        <div class="video-container__main">
            <video
                id="mainRef"
                ref="mainRef"
                autoplay
                playsinline
                muted
                class="video-container__main-element"
                :class="{ 'video--sharing': sharing }"
            />
            <div v-if="!connected" class="video-container__overlay">
                <div class="video-container__overlay-content">
                    <div class="video-container__spinner" />
                    <p class="video-container__overlay-text">等待开始通话...</p>
                </div>
            </div>
        </div>

        <!-- 本地视频小窗 -->
        <div
            class="video-container__local"
            :class="{ 'video-container__local--speaking': localSpeaking }"
        >
            <video
                ref="localRef"
                muted
                autoplay
                playsinline
                class="video-container__local-element"
            />
            <div class="video-container__label">
                <span class="video-container__label-text">我</span>
                <div v-if="localSpeaking" class="video-container__audio-indicator" />
            </div>
        </div>

        <!-- 远程参与者视频网格 -->
        <div v-if="participantList.length > 0" class="video-container__remote">
            <div
                v-for="participantId in participantList"
                :key="participantId"
                class="video-container__remote-item"
                :class="{
                    'video-container__remote-item--speaking': activeSpeakerId === participantId,
                    'video-container__remote-item--no-video': !remoteVideoStates[participantId],
                    'video--sharing': sharing
                }"
            >
                <video
                    :ref="(el: any) => setRemoteRef(participantId)(el)"
                    autoplay
                    playsinline
                    class="video-container__remote-element"
                />
                <div class="video-container__label">
                    <span class="video-container__label-text">{{ participantId }}</span>
                    <div
                        v-if="activeSpeakerId === participantId"
                        class="video-container__audio-indicator"
                    />
                </div>
            </div>
        </div>
    </main>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useMeetingStore } from '@/stores/meeting'

const meetingStore = useMeetingStore()

/** 状态 */
const connected = computed(() => meetingStore.webRTCState.connected) // 是否已连接
const camOn = computed(() => meetingStore.webRTCState.camOn) // 是否已开启摄像头
const localSpeaking = computed(() => meetingStore.webRTCState.localSpeaking) // 是否已开启本地麦克风
const participantList = computed(() => meetingStore.meetingStatusStore.participants.map(p => p.id)) // 参与者列表
const activeSpeakerId = computed(() => meetingStore.webRTCState.activeSpeakerId) // 活跃发言人ID
const remoteVideoStates = computed(() => meetingStore.meetingStatusStore.remoteVideoStates) // 远程视频状态
const sharing = computed(() => meetingStore.webRTCState.sharing) // 是否正在共享屏幕

const emit = defineEmits<{
    'set-remote-ref': [participantId: string]
}>()

const mainRef = ref<HTMLVideoElement | null>(null) // 主视频元素
const localRef = ref<HTMLVideoElement | null>(null) // 本地视频元素
const remoteVideoRefs = reactive<Record<string, HTMLVideoElement | null>>({}) // 远程视频元素引用

/**
 * 设置远程视频元素的引用
 * @param participantId 参与者 ID
 * @returns 视频元素设置函数
 */
function setRemoteRef(participantId: string) {
    return (el: HTMLVideoElement | null) => {
        remoteVideoRefs[participantId] = el

        // 如果元素存在且有对应的远程流，立即绑定
        if (el && meetingStore.meetingStatusStore.remoteStreams[participantId]) {
            nextTick(() => {
                console.log('🎥 绑定远程视频流121121212:', participantId)
                bindRemoteVideo(participantId)
            })
        }

        emit('set-remote-ref', participantId)
    }
}

/**
 * 绑定远程视频流到视频元素
 * @param participantId 参与者 ID
 */
function bindRemoteVideo(participantId: string) {
    nextTick(() => {
        const videoElement = remoteVideoRefs[participantId]
        const stream = meetingStore.meetingStatusStore.remoteStreams[participantId]
        const hasVideo = meetingStore.meetingStatusStore.getRemoteVideoState(participantId)

        console.log('🎥 尝试绑定远程视频流:', {
            participantId,
            hasElement: !!videoElement,
            hasStream: !!stream,
            hasVideo,
            streamId: stream?.id,
            videoTracks: stream?.getVideoTracks().length || 0
        })

        if (videoElement) {
            if (stream && hasVideo) {
                videoElement.srcObject = stream
                console.log('✅ 远程视频流绑定成功:', participantId)
            } else {
                // 如果视频关闭或没有流，清空视频显示
                videoElement.srcObject = null
                console.log('📹 远程视频已关闭，清空显示:', participantId)
            }
        } else {
            console.warn('❌ 远程视频元素不存在:', participantId)
        }
    })
}

// 监听远程流变化，自动绑定视频
watch(
    () => meetingStore.remoteStreams,
    newStreams => {
        Object.keys(newStreams).forEach(participantId => {
            if (remoteVideoRefs[participantId]) {
                bindRemoteVideo(participantId)
            }
        })
    },
    { deep: true }
)

// 监听参与者列表变化，确保新加入的用户能正确绑定视频
watch(
    () => participantList.value,
    newList => {
        newList.forEach(participantId => {
            if (remoteVideoRefs[participantId] && meetingStore.remoteStreams[participantId]) {
                nextTick(() => {
                    bindRemoteVideo(participantId)
                })
            }
        })
    }
)

// 监听远程视频状态变化，实时更新视频显示
watch(
    () => meetingStore.remoteVideoStates,
    (newStates, oldStates) => {
        console.log('📹 远程视频状态变化监听触发:', { newStates, oldStates })
        Object.keys(newStates).forEach(participantId => {
            if (remoteVideoRefs[participantId]) {
                const hasVideo = newStates[participantId]
                const oldHasVideo = oldStates?.[participantId]

                // 如果视频状态发生变化，重新绑定视频
                if (hasVideo !== oldHasVideo) {
                    console.log(
                        `📹 用户 ${participantId} 视频状态变化: ${oldHasVideo} -> ${hasVideo}`
                    )
                    nextTick(() => {
                        bindRemoteVideo(participantId)
                    })
                }
            }
        })
    },
    { deep: true }
)

defineExpose({
    mainRef,
    localRef,
    remoteVideoRefs
})
</script>

<style lang="less" scoped>
.video-container {
    width: 100%;
    height: 100%;
    background-color: #292727;
    background-image: radial-gradient(
        60% 80% at 50% 10%,
        rgba(255, 255, 255, 0.04),
        rgba(0, 0, 0, 0) 60%
    );

    video {
        transform: scaleX(-1); // 镜像反转
    }
    // .video--sharing {
    //   transform: scaleX(-1); // 镜像反转
    // }
}

.video-container__main {
    position: relative;
    width: 100%;
    height: 100%;
}

.video-container__main-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(110%) contrast(105%);
}

.video-container__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.video-container__overlay-content {
    text-align: center;
    color: white;
    padding: 16px 22px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.video-container__spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid #1890ff;
    border-radius: 50%;
    animation: video-container-spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes video-container-spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.video-container__overlay-text {
    font-size: 16px;
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.2px;
}

/* ==================== 本地视频小窗 ==================== */
.video-container__local {
    position: absolute;
    top: 60px;
    right: 20px;
    width: 200px;
    height: 120px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    transition: all 0.3s ease;
    z-index: 20;

    &--speaking {
        border-color: #52c41a;
        box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.28);
    }
}

.video-container__local-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* ==================== 远程视频网格 ==================== */
.video-container__remote {
    position: absolute;
    top: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 20;
}

.video-container__remote-item {
    position: relative;
    width: 160px;
    height: 100px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.32);
    transition:
        transform 0.25s ease,
        box-shadow 0.25s ease,
        border-color 0.25s ease;

    &--speaking {
        border-color: #52c41a;
        box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.28);
    }

    &--no-video {
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;

        &::before {
            content: '📹';
            font-size: 24px;
            color: #666;
            opacity: 0.7;
        }
    }

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.36);
    }
}

.video-container__remote-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #000;
}

/* ==================== 视频标签 ==================== */
.video-container__label {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    color: white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.video-container__label-text {
    font-weight: 500;
}

.video-container__audio-indicator {
    width: 8px;
    height: 8px;
    background: #52c41a;
    border-radius: 50%;
    animation: video-container-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4);
}

@keyframes video-container-pulse {
    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.5;
        transform: scale(1.2);
    }
}
</style>
