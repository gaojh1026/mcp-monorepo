<template>
    <div>
        <slot />
    </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, watch } from 'vue'
import { applyCustomTheme, generateThemeFromBaseColor } from './tokens'

interface ThemeTokenConfig {
    token?: {
        /** 主色（等价 colorPrimary） */
        colorPrimary?: string
    }
    /** 算法占位（与 AntD 接口一致，但此处仅用于保留 API 形状） */
    algorithm?: unknown[]
}

const props = defineProps<{
    /** 主题配置，支持 token.colorPrimary */
    theme?: ThemeTokenConfig
    /** 本地化对象，仅占位，保证 API 一致性 */
    locale?: unknown
}>()

const state = reactive({
    mode: (document.documentElement.getAttribute('data-theme') || 'light') as 'light' | 'dark',
    colorPrimary: props.theme?.token?.colorPrimary || '#1890ff'
})

/**
 * 将当前主色转为 tokens 并应用到 CSS 变量
 */
const applyPrimaryToTokens = () => {
    const tokens = generateThemeFromBaseColor(state.colorPrimary)
    applyCustomTheme(tokens)
}

/**
 * 监听外部触发的主题变化（dark/light），保持与全局 data-theme 同步
 */
const onThemeChange = (e: any) => {
    const mode = e?.detail?.theme || document.documentElement.getAttribute('data-theme') || 'light'
    state.mode = mode as 'light' | 'dark'
    // 可以在此依据暗亮模式调整衍生色策略（当前保持主色 tokens 不变）
    applyPrimaryToTokens()
}

watch(
    () => props.theme?.token?.colorPrimary,
    val => {
        if (val && typeof val === 'string') {
            state.colorPrimary = val
            applyPrimaryToTokens()
        }
    },
    { immediate: true }
)

onMounted(() => {
    applyPrimaryToTokens()
    window.addEventListener('themechange', onThemeChange as any)
})

onBeforeUnmount(() => {
    window.removeEventListener('themechange', onThemeChange as any)
})
</script>

<style scoped></style>
