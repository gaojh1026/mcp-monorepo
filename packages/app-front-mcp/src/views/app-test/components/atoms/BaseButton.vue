<template>
    <button :class="buttonClasses" :disabled="disabled" :type="type" @click="handleClick">
        <slot />
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 基础按钮组件的Props定义
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
}

const props = withDefaults(defineProps<Props>(), {
    type: 'button',
    variant: 'primary',
    size: 'medium',
    disabled: false,
    loading: false,
    block: false
})

/**
 * 按钮点击事件
 */
const emit = defineEmits<{
    click: [event: MouseEvent]
}>()

/**
 * 计算按钮的CSS类名
 */
const buttonClasses = computed(() => {
    const classes = ['atomic-button']

    // 变体样式
    classes.push(`atomic-button--${props.variant}`)

    // 尺寸样式
    classes.push(`atomic-button--${props.size}`)

    // 状态样式
    if (props.disabled) {
        classes.push('atomic-button--disabled')
    }

    if (props.loading) {
        classes.push('atomic-button--loading')
    }

    if (props.block) {
        classes.push('atomic-button--block')
    }

    return classes
})

/**
 * 处理按钮点击事件
 */
const handleClick = (event: MouseEvent) => {
    if (!props.disabled && !props.loading) {
        emit('click', event)
    }
}
</script>

<style scoped>
.atomic-button {
    /* 基础样式 */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 6px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    outline: none;
    user-select: none;

    /* 默认尺寸 */
    padding: 8px 16px;
    font-size: 14px;
    line-height: 1.5;
    min-height: 32px;
}

/* 尺寸变体 - 使用 Token */
.atomic-button--small {
    padding: 4px 8px;
    font-size: 12px;
    min-height: 24px;
}

.atomic-button--medium {
    padding: 8px 16px;
    font-size: 14px;
    min-height: 32px;
}

.atomic-button--large {
    padding: 12px 24px;
    font-size: 16px;
    min-height: 40px;
}

/* 变体样式 - 使用 CSS 变量 */
.atomic-button--primary {
    background-color: var(--atomic-primary-bg, #1890ff);
    border-color: var(--atomic-primary-border, #1890ff);
    color: #ffffff;
}

.atomic-button--primary:hover:not(.atomic-button--disabled) {
    background-color: var(--atomic-primary-color-hover, #40a9ff);
    border-color: var(--atomic-primary-border-hover, #40a9ff);
}

.atomic-button--secondary {
    background-color: var(--atomic-secondary-bg, #ffffff);
    border-color: var(--atomic-secondary-border, #d9d9d9);
    color: var(--atomic-secondary-color, #000000);
}

.atomic-button--secondary:hover:not(.atomic-button--disabled) {
    background-color: #f5f5f5;
    border-color: var(--atomic-primary-border-hover, #40a9ff);
    color: var(--atomic-primary-color-hover, #40a9ff);
}

.atomic-button--danger {
    background-color: var(--atomic-danger-bg, #ff4d4f);
    border-color: var(--atomic-danger-border, #ff4d4f);
    color: #ffffff;
}

.atomic-button--danger:hover:not(.atomic-button--disabled) {
    background-color: var(--atomic-danger-color-hover, #ff7875);
    border-color: var(--atomic-danger-border-hover, #ff7875);
}

.atomic-button--ghost {
    background-color: var(--atomic-ghost-bg, transparent);
    border-color: var(--atomic-ghost-border, #d9d9d9);
    color: var(--atomic-ghost-color, #000000);
}

.atomic-button--ghost:hover:not(.atomic-button--disabled) {
    background-color: var(--atomic-ghost-bg-hover, #f5f5f5);
    border-color: var(--atomic-ghost-border-hover, #1890ff);
    color: var(--atomic-ghost-color-hover, #1890ff);
}

.atomic-button--link {
    background-color: transparent;
    border-color: transparent;
    color: var(--atomic-link-color, #1890ff);
    padding: 0;
    min-height: auto;
}

.atomic-button--link:hover:not(.atomic-button--disabled) {
    color: var(--atomic-link-color-hover, #40a9ff);
    text-decoration: underline;
}

/* 状态样式 */
.atomic-button--disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.atomic-button--loading {
    cursor: not-allowed;
    opacity: 0.8;
}

.atomic-button--block {
    width: 100%;
    display: flex;
}

/* 焦点样式 - 使用 Token */
.atomic-button:focus-visible {
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.atomic-button--primary:focus-visible {
    box-shadow: 0 0 0 2px var(--atomic-primary-color-hover, #40a9ff) 33;
}

/* 激活状态 */
.atomic-button:active:not(.atomic-button--disabled) {
    transform: translateY(1px);
}

.atomic-button--primary:active:not(.atomic-button--disabled) {
    background-color: var(--atomic-primary-color-active, #096dd9);
}
</style>
