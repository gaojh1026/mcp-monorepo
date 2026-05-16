<template>
    <BaseButton
        v-bind="$attrs"
        :variant="variant"
        :size="size"
        :disabled="disabled"
        :loading="loading"
        :block="block"
        :type="type"
        @click="handleClick"
    >
        <!-- 加载状态 -->
        <template v-if="loading">
            <span class="icon-button__loading">
                <svg
                    class="icon-button__spinner"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-dasharray="31.416"
                        stroke-dashoffset="31.416"
                    >
                        <animate
                            attributeName="stroke-dasharray"
                            dur="2s"
                            values="0 31.416;15.708 15.708;0 31.416"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="stroke-dashoffset"
                            dur="2s"
                            values="0;-15.708;-31.416"
                            repeatCount="indefinite"
                        />
                    </circle>
                </svg>
            </span>
            <span v-if="loadingText" class="icon-button__text">{{ loadingText }}</span>
        </template>

        <!-- 正常状态 -->
        <template v-else>
            <!-- 前置图标 -->
            <span v-if="prefixIcon" class="icon-button__prefix">
                <component :is="prefixIcon" />
            </span>

            <!-- 按钮文本 -->
            <span v-if="$slots.default || text" class="icon-button__text">
                <slot>{{ text }}</slot>
            </span>

            <!-- 后置图标 -->
            <span v-if="suffixIcon" class="icon-button__suffix">
                <component :is="suffixIcon" />
            </span>
        </template>
    </BaseButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * 图标按钮组件的Props定义
 */
interface Props {
    /** 按钮类型 */
    type?: 'button' | 'submit' | 'reset'
    /** 按钮变体 */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
    /** 按钮尺寸 */
    size?: 'small' | 'medium' | 'large'
    /** 是否禁用 */
    disabled?: boolean
    /** 是否加载中 */
    loading?: boolean
    /** 是否块级元素 */
    block?: boolean
    /** 按钮文本 */
    text?: string
    /** 前置图标组件 */
    prefixIcon?: any
    /** 后置图标组件 */
    suffixIcon?: any
    /** 加载状态文本 */
    loadingText?: string
}

const props = withDefaults(defineProps<Props>(), {
    type: 'button',
    variant: 'primary',
    size: 'medium',
    disabled: false,
    loading: false,
    block: false,
    text: '',
    loadingText: ''
})

/**
 * 按钮点击事件
 */
const emit = defineEmits<{
    click: [event: MouseEvent]
}>()

/**
 * 处理按钮点击事件
 */
const handleClick = (event: MouseEvent) => {
    emit('click', event)
}
</script>

<style scoped>
.icon-button__loading {
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
}

.icon-button__spinner {
    width: 14px;
    height: 14px;
    animation: spin 1s linear infinite;
}

.icon-button__text {
    display: inline-flex;
    align-items: center;
}

.icon-button__prefix {
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
}

.icon-button__suffix {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
}

/* 小尺寸图标调整 */
.atomic-button--small .icon-button__spinner {
    width: 12px;
    height: 12px;
}

.atomic-button--small .icon-button__prefix,
.atomic-button--small .icon-button__suffix {
    margin-left: 2px;
    margin-right: 2px;
}

/* 大尺寸图标调整 */
.atomic-button--large .icon-button__spinner {
    width: 16px;
    height: 16px;
}

.atomic-button--large .icon-button__prefix,
.atomic-button--large .icon-button__suffix {
    margin-left: 6px;
    margin-right: 6px;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
