import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { useMeetingConfigStore } from './meeting-config'

/** 会议间-状态相关 */

/**
 * @interface MeetingStatus
 * @description 会议状态接口
 * @property {boolean} connected - 是否已连接
 * @property {boolean} micOn - 麦克风是否开启
 * @property {boolean} camOn - 摄像头是否开启
 * @property {boolean} sharing - 是否正在共享屏幕
 * @property {boolean} recording - 是否正在录制
 * @property {boolean} localSpeaking - 本地用户是否正在说话
 * @property {string} activeSpeakerId - 当前活跃说话者的ID
 * @property {number} participantCount - 参与者数量
 */
export interface WebRTCState {
    connected: boolean
    micOn: boolean
    camOn: boolean
    sharing: boolean
    recording: boolean
    localSpeaking: boolean
    activeSpeakerId: string
    participantCount: number
}

/**
 * @interface Participant
 * @description 参与者信息接口
 * @property {string} id - 参与者ID
 * @property {string} name - 参与者名称
 * @property {boolean} isSpeaking - 是否正在说话
 * @property {boolean} hasVideo - 是否有视频
 * @property {boolean} hasAudio - 是否有音频
 * @property {number} joinTime - 加入时间
 */
export interface Participant {
    id: string
    name?: string
    isSpeaking?: boolean
    hasVideo?: boolean
    hasAudio?: boolean
    joinTime?: number
}

/**
 * @interface SignalingState
 * @description 信令状态类型
 * @property {string} connected - 已连接
 * @property {string} disconnected - 已断开
 * @property {string} error - 错误
 */
export type SignalingState = 'connected' | 'disconnected' | 'error'

// ======================= 会议间 - 状态 - 状态管理 =======================

export const useMeetingStatusStore = defineStore('meeting-status', () => {
    const config = useMeetingConfigStore()
    // WebRTC 状态
    const webRTCState = reactive<WebRTCState>({
        connected: false,
        micOn: true,
        camOn: true,
        sharing: false,
        recording: false,
        localSpeaking: false,
        activeSpeakerId: '',
        participantCount: 0
    })

    // 参与者管理
    const participants = ref<Participant[]>([])
    const remoteStreams = reactive<Record<string, MediaStream>>({})
    const remoteVideoStates = reactive<Record<string, boolean>>({})

    // 信令状态
    const signalingState = ref<SignalingState>('disconnected')

    // ------------------------计算属性------------------------
    // 参与者数量（包含自己）
    const totalParticipantCount = computed(() => participants.value.length + 1)
    // 是否可以邀请（连接状态检查）
    const canInvite = computed(() => webRTCState.connected)
    // 是否有活跃说话者
    const hasActiveSpeaker = computed(() => !!webRTCState.activeSpeakerId)
    // 活跃说话者信息
    const activeSpeaker = computed(() =>
        participants.value.find(p => p.id === webRTCState.activeSpeakerId)
    )
    // 远程参与者列表
    const remoteParticipants = computed(() => {
        console.error('=== 远程参与者列表 ===', participants.value, config.config)
        return participants.value.filter(p => p.id !== config.config.userId)
    })
    // 是否正在通话
    const isInCall = computed(() => webRTCState.connected && totalParticipantCount.value > 1)
    // 是否只有自己
    const isAlone = computed(() => webRTCState.connected && participants.value.length === 0)

    // ==================== WebRTC 状态管理方法 ====================

    /**
     * 设置连接状态
     * @param connected 是否已连接
     */
    const setConnected = (connected: boolean) => {
        webRTCState.connected = connected
        if (!connected) {
            // 断开连接时清理状态
            clearParticipants()
            clearRemoteStreams()
            webRTCState.activeSpeakerId = ''
        }
    }

    /**
     * 切换麦克风状态
     * @param enabled 是否启用
     */
    const toggleMic = (enabled?: boolean) => {
        webRTCState.micOn = enabled !== undefined ? enabled : !webRTCState.micOn
    }

    /**
     * 切换摄像头状态
     * @param enabled 是否启用
     */
    const toggleCamera = (enabled?: boolean) => {
        webRTCState.camOn = enabled !== undefined ? enabled : !webRTCState.camOn
    }

    /**
     * 切换屏幕共享状态
     * @param enabled 是否启用
     */
    const toggleScreenShare = (enabled?: boolean) => {
        webRTCState.sharing = enabled !== undefined ? enabled : !webRTCState.sharing
    }

    /**
     * 切换录制状态
     * @param enabled 是否启用
     */
    const toggleRecording = (enabled?: boolean) => {
        webRTCState.recording = enabled !== undefined ? enabled : !webRTCState.recording
    }

    /**
     * 设置本地说话状态
     * @param speaking 是否在说话
     */
    const setLocalSpeaking = (speaking: boolean) => {
        webRTCState.localSpeaking = speaking
    }

    /**
     * 设置活跃说话者
     * @param speakerId 说话者ID
     */
    const setActiveSpeaker = (speakerId: string) => {
        webRTCState.activeSpeakerId = speakerId
    }

    /**
     * 更新参与者数量
     */
    const updateParticipantCount = () => {
        webRTCState.participantCount = participants.value.length + 1
    }

    // ==================== 参与者管理方法 ====================

    /**
     * 添加参与者
     * @param participant 参与者信息
     */
    const addParticipant = (participant: Participant) => {
        const existingIndex = participants.value.findIndex(p => p.id === participant.id)
        if (existingIndex === -1) {
            participants.value.push({
                ...participant,
                joinTime: participant.joinTime || Date.now()
            })
            updateParticipantCount()
            console.log('参与者已添加:', participant.id, participants.value)
        }
    }

    /**
     * 移除参与者
     * @param participantId 参与者ID
     */
    const removeParticipant = (participantId: string) => {
        const index = participants.value.findIndex(p => p.id === participantId)
        if (index > -1) {
            participants.value.splice(index, 1)
            updateParticipantCount()

            // 清理相关资源
            delete remoteStreams[participantId]
            delete remoteVideoStates[participantId]

            // 如果移除的是活跃说话者，清空活跃说话者
            if (webRTCState.activeSpeakerId === participantId) {
                webRTCState.activeSpeakerId = ''
            }

            console.log('参与者已移除:', participantId)
        }
    }

    /**
     * 更新参与者信息
     * @param participantId 参与者ID
     * @param updates 更新信息
     */
    const updateParticipant = (participantId: string, updates: Partial<Participant>) => {
        const participant = participants.value.find(p => p.id === participantId)
        if (participant) {
            Object.assign(participant, updates)
            console.log('参与者信息已更新:', participantId, updates)
        }
    }

    /**
     * 清空参与者列表
     */
    const clearParticipants = () => {
        participants.value = []
        updateParticipantCount()
    }

    /**
     * 根据ID获取参与者
     * @param participantId 参与者ID
     */
    const getParticipant = (participantId: string) => {
        return participants.value.find(p => p.id === participantId)
    }

    // ==================== 远程流管理方法 ====================

    /**
     * 添加远程流
     * @param participantId 参与者ID
     * @param stream 媒体流
     */
    const addRemoteStream = (participantId: string, stream: MediaStream) => {
        remoteStreams[participantId] = stream
        console.log('远程流已添加:', participantId, stream.id)
    }

    /**
     * 移除远程流
     * @param participantId 参与者ID
     */
    const removeRemoteStream = (participantId: string) => {
        delete remoteStreams[participantId]
        console.log('远程流已移除:', participantId)
    }

    /**
     * 清空远程流
     */
    const clearRemoteStreams = () => {
        Object.keys(remoteStreams).forEach(key => {
            delete remoteStreams[key]
        })
    }

    /**
     * 设置远程视频状态
     * @param participantId 参与者ID
     * @param hasVideo 是否有视频
     */
    const setRemoteVideoState = (participantId: string, hasVideo: boolean) => {
        remoteVideoStates[participantId] = hasVideo
    }

    /**
     * 获取远程视频状态
     * @param participantId 参与者ID
     */
    const getRemoteVideoState = (participantId: string) => {
        return remoteVideoStates[participantId] || false
    }

    /**
     * 设置信令状态
     * @param state 信令状态
     */
    const setSignalingState = (state: SignalingState) => {
        signalingState.value = state
        console.log('信令状态已更新:', state)
    }

    // ==================== 工具方法 ====================

    const resetStatus = () => {
        Object.assign(webRTCState, {
            connected: false,
            micOn: true,
            camOn: true,
            sharing: false,
            recording: false,
            localSpeaking: false,
            activeSpeakerId: '',
            participantCount: 0
        })

        // 清空参与者
        clearParticipants()
        clearRemoteStreams()
    }

    return {
        webRTCState,
        participants,
        remoteStreams,
        remoteVideoStates,
        totalParticipantCount,
        canInvite,
        hasActiveSpeaker,
        activeSpeaker,
        remoteParticipants,
        isInCall,
        isAlone,
        signalingState,
        resetStatus,

        // WebRTC 状态管理方法
        setConnected,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        toggleRecording,
        setLocalSpeaking,
        setActiveSpeaker,
        updateParticipantCount,
        addParticipant,
        removeParticipant,
        updateParticipant,
        clearParticipants,
        getParticipant,
        addRemoteStream,
        removeRemoteStream,
        clearRemoteStreams,
        setRemoteVideoState,
        getRemoteVideoState,
        setSignalingState
    }
})
