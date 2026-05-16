<template>
    <div class="chat-area">
        <div class="chat-header">
            <div class="header-content">
                <h2 class="chat-title">AI 智能助手</h2>
                <p class="chat-subtitle">基于大语言模型的智能对话系统</p>
            </div>

            <div class="header-actions">
                <a-button type="default" size="small" @click="handleNewChat">
                    <template #icon>
                        <svg-icon name="plus" />
                    </template>
                    新对话
                </a-button>

                <a-button type="default" size="small" @click="handleClearChat">
                    <template #icon>
                        <svg-icon name="clear" />
                    </template>
                    清空
                </a-button>
            </div>
        </div>

        <div class="chat-messages" ref="messagesContainer">
            <div v-if="messages.length === 0" class="empty-state">
                <div class="empty-icon">
                    <svg-icon name="chat" />
                </div>
                <h3 class="empty-title">开始你的AI对话</h3>
                <p class="empty-desc">输入问题，AI助手将为你提供智能回答</p>
            </div>

            <template v-else>
                <message-item v-for="message in messages" :key="message.id" :message="message" />
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, nextTick, watch } from 'vue'
import MessageItem from './MessageItem.vue'
import SvgIcon from '@/components/SvgIcon/index.vue'
import type { Message } from '../index.vue'

interface Props {
    messages: Message[]
}

interface Emits {
    (e: 'new-chat'): void
    (e: 'clear-chat'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const messagesContainer = ref<HTMLDivElement>()

const handleNewChat = () => {
    emit('new-chat')
}

const handleClearChat = () => {
    emit('clear-chat')
}

// 自动滚动到底部
const scrollToBottom = async () => {
    await nextTick()
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
}

// 监听消息变化，自动滚动
watch(
    () => props.messages.length,
    () => {
        scrollToBottom()
    }
)

// 监听最后一条消息的状态变化
watch(
    () => props.messages[props.messages.length - 1]?.status,
    () => {
        scrollToBottom()
    },
    { deep: true }
)
</script>

<style lang="less" scoped>
.chat-area {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fafafa;
}

.chat-header {
    background: white;
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.header-content {
    .chat-title {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 600;
        color: #333;
    }

    .chat-subtitle {
        margin: 0;
        font-size: 14px;
        color: #666;
    }
}

.header-actions {
    display: flex;
    gap: 8px;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: #d9d9d9;
        border-radius: 3px;

        &:hover {
            background: #bfbfbf;
        }
    }
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: #999;
}

.empty-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    font-size: 32px;
    color: #667eea;
}

.empty-title {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 600;
    color: #666;
}

.empty-desc {
    margin: 0;
    font-size: 14px;
    color: #999;
    line-height: 1.5;
}
</style>
