<template>
    <div class="message-item" :class="message.role">
        <div class="message-avatar">
            <div class="avatar-icon">
                <svg-icon v-if="message.role === 'user'" name="user" />
                <svg-icon v-else name="bot" />
            </div>
        </div>

        <div class="message-content">
            <div class="message-header">
                <span class="role-name">{{ message.role === 'user' ? '我' : 'AI助手' }}</span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>

            <div class="message-text" :class="{ sending: message.status === 'sending' }">
                <!-- <div v-if="message.status === 'sending'" class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div> -->
                <div class="content-text" v-html="formatContent(message.content)"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import SvgIcon from '@/components/SvgIcon/index.vue'
import type { Message } from '../index.vue'

interface Props {
    message: Message
}

const props = defineProps<Props>()

const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    })
}

const formatContent = (content: string): string => {
    // 简单的markdown格式化
    return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
}
</script>

<style lang="less" scoped>
.message-item {
    display: flex;
    margin-bottom: 24px;
    animation: fadeIn 0.3s ease-in-out;

    &.user {
        flex-direction: row-reverse;

        .message-content {
            margin-right: 12px;
            margin-left: 0;
            align-items: flex-end;
        }

        .message-text {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 18px 18px 4px 18px;
        }
    }

    &.assistant {
        .message-content {
            margin-left: 12px;
            margin-right: 0;
            align-items: flex-start;
        }

        .message-text {
            background: #f8f9fa;
            color: #333;
            border-radius: 18px 18px 18px 4px;
        }
    }
}

.message-avatar {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
}

.avatar-icon {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;

    .user & {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
}

.message-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 70%;
}

.message-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
}

.role-name {
    font-weight: 600;
    font-size: 14px;
    color: #666;
}

.message-time {
    font-size: 12px;
    color: #999;
}

.message-text {
    padding: 12px 16px;
    line-height: 1.6;
    word-wrap: break-word;
    position: relative;

    &.sending {
        min-height: 60px;
        display: flex;
        align-items: center;
    }
}

.content-text {
    :deep(code) {
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
    }

    :deep(strong) {
        font-weight: 600;
    }

    :deep(em) {
        font-style: italic;
    }
}

.typing-indicator {
    display: flex;
    gap: 4px;

    span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.6;
        animation: typing 1.4s infinite ease-in-out;

        &:nth-child(1) {
            animation-delay: -0.32s;
        }
        &:nth-child(2) {
            animation-delay: -0.16s;
        }
    }
}

@keyframes typing {
    0%,
    80%,
    100% {
        transform: scale(0.8);
        opacity: 0.6;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
