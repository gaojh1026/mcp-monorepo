import { message } from 'ant-design-vue'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { useMeetingConfigStore } from './meeting-config'

/** 会议间-聊天相关 */

/**
 * @interface ChatMessage
 * @description 聊天消息接口
 * @property {string} id - 消息ID
 * @property {string} userId - 用户ID
 * @property {string} userName - 用户名称
 * @property {string} content - 消息内容
 * @property {number} timestamp - 消息时间
 * @property {('text'|'system'|'image'|'file')} type - 消息类型
 * @property {boolean} [isLocal] - 是否为本地用户发送的消息
 */
export interface ChatMessage {
    id: string
    userId: string
    userName?: string
    content: string
    timestamp: number
    type: 'text' | 'system' | 'image' | 'file'
    isLocal?: boolean
}

/**
 * @interface ChatState
 * @description 聊天状态接口
 * @property {ChatMessage[]} messages - 消息列表
 * @property {boolean} isVisible - 聊天面板是否可见
 * @property {number} unreadCount - 未读消息数量
 */
export interface ChatState {
    messages: ChatMessage[]
    isVisible: boolean
    unreadCount: number
}

// ======================= 会议间 - 聊天 - 状态管理 =======================

export const useMeetingChatStore = defineStore('chat', () => {
    const meetingConfigStore = useMeetingConfigStore()
    // 聊天状态
    const chatState = reactive<ChatState>({
        messages: [],
        isVisible: false,
        unreadCount: 0
    })

    /**
     * 设置发送的聊天消息( 默认是本地消息 )
     * @param {string} chat 聊天消息
     * @param {ChatMessage['type']} type 消息类型
     * @param {Partial<ChatMessage>} message 消息 支持自定义覆盖
     */
    const setMessages = (
        chat: string,
        type: ChatMessage['type'] = 'text',
        message?: Partial<ChatMessage>
    ) => {
        const { userId, userName } = meetingConfigStore.config

        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            userName,
            content: chat.trim(),
            timestamp: Date.now(),
            type,
            isLocal: true,
            ...message
        }
    }

    /**
     * 添加聊天消息
     * @param {ChatMessage} message - 聊天消息
     */
    const addChatMessage = (message: ChatMessage) => {
        chatState.messages.push(message)

        // 如果不是本地用户发送的消息且聊天面板不可见，增加未读计数
        if (!message.isLocal && !chatState.isVisible) {
            chatState.unreadCount++
        }
    }

    /**
     * 发送聊天消息
     * @param payload.userId 用户ID
     * @param payload.userName 用户名称
     * @param payload.content 消息内容
     * @param payload.type 消息类型
     */
    const sendChatMessage = (payload: {
        userId: string
        userName?: string
        content: string
        type?: ChatMessage['type']
    }) => {
        const { userId, userName, content, type } = payload

        const message = setMessages(content, type, {
            userId,
            userName
        })

        addChatMessage(message)
    }

    /**
     * 清空聊天消息
     */
    const clearChatMessages = () => {
        chatState.messages = []
        chatState.unreadCount = 0
    }

    /**
     * 获取聊天消息列表
     * @returns
     */
    const getChatMessages = () => {
        return chatState.messages
    }

    /**
     * 切换聊天面板可见性
     * @param visible 是否可见
     */
    const toggleChatVisibility = (visible?: boolean) => {
        chatState.isVisible = visible !== undefined ? visible : !chatState.isVisible
        if (chatState.isVisible) {
            chatState.unreadCount = 0
        }
    }

    /**
     * 重置聊天状态
     */
    const resetChatState = () => {
        chatState.messages = []
        chatState.unreadCount = 0
    }

    return {
        chatState,
        setMessages,
        addChatMessage,
        sendChatMessage,
        toggleChatVisibility,
        clearChatMessages,
        getChatMessages,
        resetChatState
    }
})
