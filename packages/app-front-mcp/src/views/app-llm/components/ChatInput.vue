<template>
    <div class="chat-input">
        <div class="input-container">
            <a-textarea
                v-model:value="inputValue"
                :placeholder="placeholder"
                :disabled="disabled"
                :rows="1"
                :auto-size="{ minRows: 1, maxRows: 4 }"
                class="message-input"
                @keydown="handleKeyDown"
                @input="handleInput"
            />

            <div class="input-actions">
                <a-button
                    type="primary"
                    :disabled="!canSend || disabled"
                    :loading="loading"
                    class="send-button"
                    @click="handleSend"
                >
                    <template #icon>
                        <svg-icon name="send" />
                    </template>
                    发送
                </a-button>

                <a-button v-if="loading" type="default" class="stop-button" @click="handleStop">
                    <template #icon>
                        <svg-icon name="stop" />
                    </template>
                    停止
                </a-button>
            </div>
        </div>

        <div class="input-footer">
            <span class="input-tip">按 Enter 发送，Shift + Enter 换行</span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import SvgIcon from '@/components/SvgIcon/index.vue'

interface Props {
    disabled?: boolean
    loading?: boolean
    placeholder?: string
}

interface Emits {
    (e: 'send', message: string): void
    (e: 'stop'): void
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    loading: false,
    placeholder: '输入消息...'
})

const emit = defineEmits<Emits>()

const inputValue = ref('')

const canSend = computed(() => {
    return inputValue.value.trim().length > 0 && !props.disabled
})

const handleInput = () => {
    // 自动调整高度
}

const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSend.value) {
            handleSend()
        }
    }
}

const handleSend = () => {
    if (!canSend.value) return

    const message = inputValue.value.trim()
    emit('send', message)
    inputValue.value = ''
}

const handleStop = () => {
    emit('stop')
}

// 监听loading状态，重置输入框
watch(
    () => props.loading,
    newVal => {
        if (!newVal) {
            // 可以在这里添加发送完成后的逻辑
        }
    }
)
</script>

<style lang="less" scoped>
.chat-input {
    border-top: 1px solid #f0f0f0;
    background: white;
    padding: 16px;
}

.input-container {
    display: flex;
    gap: 12px;
    align-items: flex-end;
}

.message-input {
    flex: 1;
    border-radius: 12px;
    border: 1px solid #d9d9d9;
    transition: all 0.3s ease;

    &:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }

    &:hover {
        border-color: #667eea;
    }
}

.input-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.send-button {
    border-radius: 8px;
    height: 40px;
    padding: 0 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;

    &:hover {
        background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    }

    &:disabled {
        background: #f5f5f5;
        color: #bfbfbf;
    }
}

.stop-button {
    border-radius: 8px;
    height: 40px;
    padding: 0 16px;
    border: 1px solid #d9d9d9;

    &:hover {
        border-color: #ff4d4f;
        color: #ff4d4f;
    }
}

.input-footer {
    margin-top: 8px;
    display: flex;
    justify-content: center;
}

.input-tip {
    font-size: 12px;
    color: #999;
}
</style>
