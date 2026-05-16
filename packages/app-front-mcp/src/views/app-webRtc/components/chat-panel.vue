<template>
    <!-- 聊天面板 -->
    <div class="chat-panel">
        <div class="message-trigger" @click="handleVisible">
            <MessageOutlined class="message-trigger-icon" />
        </div>

        <!-- 对话框内容 -->
        <a-drawer
            :open="chatState.isVisible"
            placement="right"
            :body-style="{ padding: 0, display: 'flex', 'flex-direction': 'column' }"
            @close="handleVisible"
        >
            <template #title>
                <!-- 聊天头部 -->
                <div class="chat-panel__header">
                    <span>聊天记录</span>
                    <a-badge v-if="unreadCount > 0" :count="unreadCount" />
                </div>
            </template>

            <!-- 消息列表 -->
            <div class="chat-panel__messages" ref="messagesContainer">
                <div
                    v-for="message in messages"
                    :key="message.id"
                    class="chat-message"
                    :class="{
                        'chat-message--local': message.isLocal,
                        'chat-message--system': message.type === 'system'
                    }"
                >
                    <div class="chat-message__avatar">
                        <a-avatar :size="32">
                            {{ message.userName?.charAt(0) || 'U121' }}
                        </a-avatar>
                    </div>
                    <div class="chat-message__content">
                        <div class="chat-message__header">
                            <span class="chat-message__username">{{ message.userName }}</span>
                            <span class="chat-message__time">{{
                                formatTime(message.timestamp)
                            }}</span>
                        </div>
                        <div class="chat-message__text">{{ message.content }}</div>
                    </div>
                </div>
            </div>

            <!-- 输入框 -->
            <div class="chat-panel__input">
                <a-textarea
                    v-model:value="inputMessage"
                    :placeholder="connected ? '请输入消息..' : '请先进入会议..'"
                    :rows="2"
                    :disabled="!connected"
                    @keydown.enter="onSendMessage"
                />
            </div>
        </a-drawer>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useMeetingStore } from '@/stores/meeting'
import { MessageOutlined } from '@ant-design/icons-vue'
import type { ChatMessage } from '@/stores/meeting/meeting-chat'
import type { SignalingManager } from '../core/socket/socket-manager'

interface Props {
    signalingManager: SignalingManager
}

const props = defineProps<Props>()
const meetingStore = useMeetingStore()
const chatStore = meetingStore.chatStore // 聊天管理

/** 模块一：信息 */
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement>()

const { chatState, toggleChatVisibility } = chatStore // 聊天状态，切换聊天面板可见性

// 计算属性
const messages = computed(() => meetingStore.chatState.messages) // 聊天消息列表
const unreadCount = computed(() => meetingStore.chatState.unreadCount) // 未读消息数量
const connected = computed(() => meetingStore.webRTCState.connected) // 是否已连接

const handleVisible = () => {
    toggleChatVisibility()
}

/**
 * 格式化时间
 * @param timestamp 时间戳
 */
const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 如果是今天
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // 如果是昨天
    if (diff < 48 * 60 * 60 * 1000 && date.getDate() === now.getDate() - 1) {
        return `昨天 ${date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        })}`
    }

    // 其他情况显示日期
    return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * 发送消息
 */
const onSendMessage = async () => {
    if (!inputMessage.value.trim() || !connected.value) return

    const message: ChatMessage = chatStore.setMessages(inputMessage.value.trim(), 'text')

    // 本地保存消息
    meetingStore.chatStore.addChatMessage(message)
    // 通过信令服务发送消息
    props.signalingManager.signalingService.sendChatMessage({
        id: message.id,
        userName: message.userName,
        userId: message.userId,
        content: message.content,
        type: message.type
    })

    // 清空输入框
    inputMessage.value = ''
}

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
}

/**
 * 监听消息变化或聊天面板可见性变化，自动滚动到底部
 */
watch(
    [messages, () => chatState.isVisible],
    ([, visible]) => {
        if (visible) {
            scrollToBottom()
        }
    },
    { deep: true }
)
</script>

<style lang="less" scoped>
.chat-panel {
    .message-trigger {
        position: fixed;
        right: 20px;
        bottom: 32px;
        z-index: 222;
        color: #fff;
        .message-trigger-icon {
            font-size: 20px;
            cursor: pointer;
        }
        &:hover {
            opacity: 0.7;
        }
    }

    &__header {
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    &__messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overscroll-behavior: contain;
        scroll-behavior: smooth;
        background: #f8f9fa;
    }

    &__input {
        padding: 16px;
        border-top: 1px solid #e8e8e8;
        background: #fff;
        position: sticky;
        bottom: 0;
        z-index: 1;
    }
}

.chat-message {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    animation: fadeIn 0.2s ease-out;
    margin-bottom: 4px;

    &__avatar {
        flex-shrink: 0;
        width: 32px;
        height: 32px;

        :deep(.ant-avatar) {
            background: linear-gradient(135deg, #ff6b6b, #feca57);
            font-weight: 600;
            font-size: 13px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    }

    &__content {
        max-width: 70%;
        background: #fff;
        padding: 8px 12px;
        border-radius: 18px 18px 18px 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        word-break: break-word;
        position: relative;
        border: 1px solid #f0f0f0;
    }

    &__header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
    }

    &__username {
        font-weight: 600;
        font-size: 12px;
        color: #666;
    }

    &__time {
        font-size: 12px;
        color: #999;
    }

    &__text {
        font-size: 14px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        color: #333;
    }

    &--local {
        flex-direction: row-reverse;

        .chat-message__header {
            text-align: right;
        }
        .chat-message__text {
            width: 100%;
            text-align: right;
        }
    }
    &--system {
        justify-content: center;
        margin: 7px 0;

        .chat-message__content {
            background: transparent;
            font-size: 12px;
            padding: 0;
            box-shadow: none;
            border: none;
        }

        .chat-message__text {
            color: #b5b1b1;
            font-size: 12px;
            text-align: center;
        }
        .chat-message__avatar {
            display: none;
        }
        .chat-message__header {
            justify-content: center;
            .chat-message__username {
                display: none;
            }
            .chat-message__time {
                text-align: center;
            }
        }
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(8px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}
</style>
