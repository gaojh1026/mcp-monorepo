<template>
    <div class="app-llm">
        <div class="chat-container">
            <chat-area
                :messages="messages"
                @new-chat="handleNewChat"
                @clear-chat="handleClearChat"
            />

            <chat-input
                :disabled="isLoading"
                :loading="isLoading"
                @send="handleSendMessage"
                @stop="handleStopGeneration"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import ChatArea from './components/ChatArea.vue'
import ChatInput from './components/ChatInput.vue'
import { llmService } from './service'

export interface LLMRequest {
    message: string
    chartId?: string
    model?: string
}

export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    status?: 'sending' | 'success' | 'error'
}

// 响应式数据
const messages = ref<Message[]>([])
const isLoading = ref(false)
const currentChartId = ref<string>('')

// 初始化
onMounted(() => {
    currentChartId.value = llmService.createSession()
})

onUnmounted(() => {
    llmService.cancelRequest()
})

// 创建消息对象
const createMessage = (
    role: 'user' | 'assistant',
    content: string,
    status: Message['status'] = 'success'
): Message => ({
    id: llmService.generateId(),
    role,
    content,
    timestamp: Date.now(),
    status
})

// 处理发送消息
const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // 添加用户消息
    const userMessage = createMessage('user', content.trim())
    messages.value.push(userMessage)

    // 添加AI助手消息
    const assistantMessage = createMessage('assistant', '', 'sending')
    messages.value.push(assistantMessage)

    isLoading.value = true

    try {
        const request: LLMRequest = {
            message: content.trim(),
            chartId: currentChartId.value
        }

        await llmService.sendMessage(
            request,
            // 处理流式响应
            (data: any) => {
                console.log('data--', data)
                assistantMessage.content += data?.data?.content || ''
            },
            // 处理错误
            (error: Error) => {
                console.error('LLM请求错误:', error)
                message.error('请求失败，请重试')
                assistantMessage.status = 'error'
                assistantMessage.content = '抱歉，请求失败，请重试。'
            },
            // 处理完成
            () => {
                assistantMessage.status = 'success'
                isLoading.value = false
            }
        )
    } catch (error) {
        console.error('发送消息失败:', error)
        message.error('发送失败，请重试')
        assistantMessage.status = 'error'
        assistantMessage.content = '抱歉，发送失败，请重试。'
        isLoading.value = false
    }
}

// 处理停止生成
const handleStopGeneration = () => {
    llmService.cancelRequest()
    isLoading.value = false

    const lastAssistantMessage = messages.value.filter(msg => msg.role === 'assistant').pop()

    if (lastAssistantMessage?.status === 'sending') {
        lastAssistantMessage.status = 'success'
        if (!lastAssistantMessage.content) {
            lastAssistantMessage.content = '已停止生成。'
        }
    }
}

// 处理新对话
const handleNewChat = () => {
    messages.value = []
    currentChartId.value = llmService.createSession()
    llmService.cancelRequest()
    isLoading.value = false
    message.success('已开始新对话')
}

// 处理清空对话
const handleClearChat = () => {
    messages.value = []
    llmService.cancelRequest()
    isLoading.value = false
    message.success('已清空对话')
}
</script>

<style lang="less" scoped>
.app-llm {
    height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.chat-container {
    width: 100%;
    max-width: 1200px;
    height: 100%;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

// 响应式设计
@media (max-width: 768px) {
    .app-llm {
        padding: 10px;
    }

    .chat-container {
        border-radius: 12px;
    }
}
</style>
