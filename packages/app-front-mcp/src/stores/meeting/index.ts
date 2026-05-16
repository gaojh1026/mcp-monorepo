import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { useMeetingChatStore } from './meeting-chat'
import { useMeetingConfigStore } from './meeting-config'
import { useMeetingStatusStore } from './meeting-status'

/** 会议间管理 store(聚合其他store) */

// ======================= pinia 状态管理 =======================

export const useMeetingStore = defineStore(
    'meeting',
    () => {
        // 会议配置
        const {
            config,
            currentUser,
            setConfig,
            setRoomId,
            setUserId,
            setUserName,
            setServerUrl,
            toggleDebug,
            resetConfig
        } = useMeetingConfigStore()
        const meetingConfigStore = useMeetingConfigStore()
        const chatStore = useMeetingChatStore()
        // 聊天相关
        const {
            chatState,
            addChatMessage,
            sendChatMessage,
            toggleChatVisibility,
            clearChatMessages,
            getChatMessages,
            resetChatState
        } = useMeetingChatStore()

        // 会议状态
        const {
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
        } = useMeetingStatusStore()
        const meetingStatusStore = useMeetingStatusStore()

        /**
         * 重置所有状态
         */
        const reset = () => {
            resetConfig()
            resetStatus()
            resetChatState()
            console.log('会议已重置')
        }

        return {
            // 状态
            config,
            webRTCState,
            participants,
            remoteStreams,
            remoteVideoStates,
            signalingState,
            chatState,

            // 计算属性
            currentUser,
            totalParticipantCount,
            canInvite,
            hasActiveSpeaker,
            activeSpeaker,
            remoteParticipants,
            isInCall,
            isAlone,

            setConfig,
            setRoomId,
            setUserId,
            setUserName,
            setServerUrl,
            toggleDebug,

            // WebRTC 状态管理方法
            setConnected,
            toggleMic,
            toggleCamera,
            toggleScreenShare,
            toggleRecording,
            setLocalSpeaking,
            setActiveSpeaker,
            updateParticipantCount,

            // 参与者管理方法
            addParticipant,
            removeParticipant,
            updateParticipant,
            clearParticipants,
            getParticipant,

            // 远程流管理方法
            addRemoteStream,
            removeRemoteStream,
            clearRemoteStreams,
            setRemoteVideoState,
            getRemoteVideoState,

            // 信令状态管理方法
            setSignalingState,

            // 聊天管理方法
            addChatMessage,
            sendChatMessage,
            toggleChatVisibility,
            clearChatMessages,
            getChatMessages,

            // 工具方法
            reset,

            // 备用
            chatStore,
            meetingStatusStore,
            meetingConfigStore
        }
    },
    {
        persist: true
    }
)
