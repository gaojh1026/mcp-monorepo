<template>
    <div :class="buttonGroupClasses">
        <BaseButton
            v-for="(button, index) in buttons"
            :key="button.key || index"
            :variant="button.variant || variant"
            :size="button.size || size"
            :disabled="button.disabled || disabled"
            :loading="button.loading"
            :type="button.type || type"
            :class="getButtonClasses(index)"
            @click="handleButtonClick(button, index, $event)"
        >
            <!-- 前置图标 -->
            <span v-if="button.prefixIcon" class="button-group__prefix">
                <component :is="button.prefixIcon" />
            </span>

            <!-- 按钮文本 -->
            <span v-if="button.text" class="button-group__text">
                {{ button.text }}
            </span>

            <!-- 后置图标 -->
            <span v-if="button.suffixIcon" class="button-group__suffix">
                <component :is="button.suffixIcon" />
            </span>
        </BaseButton>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * 按钮组中单个按钮的配置
 */
interface ButtonConfig {
    /** 唯一标识 */
    key?: string | number
    /** 按钮文本 */
    text: string
    /** 按钮变体 */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
    /** 按钮尺寸 */
    size?: 'small' | 'medium' | 'large'
    /** 是否禁用 */
    disabled?: boolean
    /** 是否加载中 */
    loading?: boolean
    /** 按钮类型 */
    type?: 'button' | 'submit' | 'reset'
    /** 前置图标 */
    prefixIcon?: any
    /** 后置图标 */
    suffixIcon?: any
    /** 点击回调 */
    onClick?: (event: MouseEvent) => void
}

/**
 * 按钮组组件的Props定义
 */
interface Props {
    /** 按钮配置数组 */
    buttons: ButtonConfig[]
    /** 按钮组方向 */
    direction?: 'horizontal' | 'vertical'
    /** 按钮间距 */
    spacing?: 'none' | 'small' | 'medium' | 'large'
    /** 默认按钮变体 */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
    /** 默认按钮尺寸 */
    size?: 'small' | 'medium' | 'large'
    /** 是否整体禁用 */
    disabled?: boolean
    /** 默认按钮类型 */
    type?: 'button' | 'submit' | 'reset'
    /** 是否紧凑模式 */
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    direction: 'horizontal',
    spacing: 'medium',
    variant: 'primary',
    size: 'medium',
    disabled: false,
    type: 'button',
    compact: false
})

/**
 * 按钮组点击事件
 */
const emit = defineEmits<{
    buttonClick: [button: ButtonConfig, index: number, event: MouseEvent]
}>()

/**
 * 计算按钮组的CSS类名
 */
const buttonGroupClasses = computed(() => {
    const classes = ['button-group']

    // 方向样式
    classes.push(`button-group--${props.direction}`)

    // 间距样式
    classes.push(`button-group--spacing-${props.spacing}`)

    // 紧凑模式
    if (props.compact) {
        classes.push('button-group--compact')
    }

    return classes
})

/**
 * 获取单个按钮的CSS类名
 */
const getButtonClasses = (index: number) => {
    const classes = ['button-group__button']

    // 第一个按钮
    if (index === 0) {
        classes.push('button-group__button--first')
    }

    // 最后一个按钮
    if (index === props.buttons.length - 1) {
        classes.push('button-group__button--last')
    }

    // 中间按钮
    if (index > 0 && index < props.buttons.length - 1) {
        classes.push('button-group__button--middle')
    }

    return classes
}

/**
 * 处理按钮点击事件
 */
const handleButtonClick = (button: ButtonConfig, index: number, event: MouseEvent) => {
    // 执行按钮自身的点击回调
    if (button.onClick) {
        button.onClick(event)
    }

    // 触发按钮组的事件
    emit('buttonClick', button, index, event)
}
</script>

<style scoped>
.button-group {
    display: inline-flex;
}

/* 水平方向 */
.button-group--horizontal {
    flex-direction: row;
}

.button-group--horizontal .button-group__button:not(:last-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right-width: 0;
}

.button-group--horizontal .button-group__button:not(:first-child) {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

/* 垂直方向 */
.button-group--vertical {
    flex-direction: column;
}

.button-group--vertical .button-group__button:not(:last-child) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-width: 0;
}

.button-group--vertical .button-group__button:not(:first-child) {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
}

/* 间距样式 */
.button-group--spacing-none .button-group__button {
    margin: 0;
}

.button-group--spacing-small.button-group--horizontal .button-group__button:not(:last-child) {
    margin-right: 4px;
}

.button-group--spacing-small.button-group--vertical .button-group__button:not(:last-child) {
    margin-bottom: 4px;
}

.button-group--spacing-medium.button-group--horizontal .button-group__button:not(:last-child) {
    margin-right: 8px;
}

.button-group--spacing-medium.button-group--vertical .button-group__button:not(:last-child) {
    margin-bottom: 8px;
}

.button-group--spacing-large.button-group--horizontal .button-group__button:not(:last-child) {
    margin-right: 16px;
}

.button-group--spacing-large.button-group--vertical .button-group__button:not(:last-child) {
    margin-bottom: 16px;
}

/* 紧凑模式 */
.button-group--compact.button-group--horizontal .button-group__button:not(:last-child) {
    margin-right: 0;
}

.button-group--compact.button-group--vertical .button-group__button:not(:last-child) {
    margin-bottom: 0;
}

/* 按钮组内按钮样式 */
.button-group__button {
    position: relative;
}

.button-group__button:hover {
    z-index: 1;
}

.button-group__button:focus {
    z-index: 2;
}

/* 按钮组内图标和文本样式 */
.button-group__prefix {
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
}

.button-group__text {
    display: inline-flex;
    align-items: center;
}

.button-group__suffix {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
}

/* 小尺寸调整 */
.button-group--horizontal .atomic-button--small.button-group__button:not(:last-child) {
    margin-right: 2px;
}

.button-group--vertical .atomic-button--small.button-group__button:not(:last-child) {
    margin-bottom: 2px;
}

/* 大尺寸调整 */
.button-group--horizontal .atomic-button--large.button-group__button:not(:last-child) {
    margin-right: 12px;
}

.button-group--vertical .atomic-button--large.button-group__button:not(:last-child) {
    margin-bottom: 12px;
}
</style>
