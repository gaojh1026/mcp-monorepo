<template>
    <!-- 精选更多牛人按钮样式 -->
    <div
        class="generate-button-wrapper"
        :class="[
            { 'generate-button-wrapper_disabled': disabled },
            { 'generate-button-wrapper_loading': loading }
        ]"
    >
        <div ref="btnRef" class="generate-button" @mouseenter="onEnter" @mouseleave="onLeave">
            <!-- 左侧按钮区 -->
            <div class="leftIcon-wrapper">
                <div
                    ref="lottieContainer"
                    class="star-lottie-container"
                    v-show="showLeftIcon"
                ></div>
                <slot name="leftIcon"></slot>
            </div>
            <!-- 文本区 -->
            <span class="generate-button-text"><slot>Generate Site</slot></span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick, watch, toRefs } from 'vue'
import { useLottieAnimation } from './useLottieAnimation'
import { useGsapAnimations } from './useGsapAnimations'

interface Props {
    disabled?: boolean
    loading?: boolean // 加载中
    showLeftIcon?: boolean // 是否显示左侧图标
}
const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    showLeftIcon: true
})

const btnRef = ref<HTMLButtonElement | null>(null)

// Lottie 动画
const {
    lottieContainer,
    init: initLottie,
    handleAnimation: handleLottieAnimation,
    destroy: destroyLottie,
    reload: reloadLottie
} = useLottieAnimation()

// GSAP 动画
const {
    init: initGsap,
    destroy: destroyGsap,
    handleAnimation: handleGsapAnimation
} = useGsapAnimations()

// 初始化
const init = () => {
    const button = btnRef.value
    if (!button) return

    try {
        nextTick(() => {
            // GSAP 初始化（粒子、描边、星形闪烁时间线）
            initGsap(button)
            // Lottie 初始化需等待容器节点渲染

            initLottie(props.loading)
        })
    } catch {
        // 忽略单次异常，避免页面崩溃
    }
}

// 销毁动画与清理资源
const destroyData = () => {
    destroyGsap()
    destroyLottie()
}

onMounted(() => {
    init()
})
onBeforeUnmount(() => {
    destroyData()
})

watch(
    () => props.loading,
    newVal => {
        reloadLottie(newVal)
    }
)

// 鼠标悬停
const onEnter = () => {
    handleGsapAnimation('play')
    handleLottieAnimation('play')
}

// 悬停离开
const onLeave = () => {
    handleGsapAnimation('pause')
    if (!props.loading) {
        handleLottieAnimation('pause')
    } else {
        handleLottieAnimation('play')
    }
}
</script>

<style lang="less">
@borderRadius: 24px;

.generate-button-wrapper {
    background-color: #fff;

    --generate-button-dots-opacity: 0;
    &_disabled {
        cursor: not-allowed;
        > * {
            pointer-events: none;
            opacity: 0.7;
        }
    }
}

.generate-button {
    padding: 10px 12px;
    border-radius: @borderRadius;
    background-color: #7171fd;
    display: inline-flex;
    position: relative;
    cursor: pointer;
    z-index: 1;
    transform: scale(var(--generate-button-scale, 1)) translateZ(0);
    box-shadow: 0 4px 16px 0 var(--generate-button-shadow-wide);
    transition: all 0.3s cubic-bezier(0.32, 0.94, 0.6, 1);
    overflow: hidden;
    &:hover {
        --generate-button-scale: 1.1;
        --generate-button-shadow-wide: rgba(0, 0, 0, 0.1);

        .stroke {
            svg {
                animation: stroke 1.5s linear infinite;
            }
        }
        &:active {
            --generate-button-scale: 1.05;
        }
    }

    span.generate-button-text {
        position: relative;
        z-index: 1;
        color: #fff;
        font-size: 14px;
        font-weight: 500;
        line-height: 22px; /* 1.571 */
        display: block;
    }

    .stroke {
        mix-blend-mode: hard-light;
        svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            fill: none;
            stroke-width: 2px;
            stroke: #ebebfe;
            stroke-dasharray: 2 14;
            stroke-dashoffset: 22;
            stroke-linecap: round;
            opacity: 0;
        }
    }
    .leftIcon-wrapper {
        margin-right: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        .star-lottie-container {
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            flex-shrink: 0;
            // 确保 Lottie SVG 正确显示
            :deep(svg) {
                width: 100%;
                height: 100%;
                display: block;
            }
        }
    }

    svg {
        display: block;
        overflow: visible;
        pointer-events: none;
        &.dots {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
            fill: #ded3ed;
            opacity: var(--generate-button-dots-opacity);
        }
    }
}

@keyframes stroke {
    0% {
        opacity: 0;
    }
    25%,
    75% {
        opacity: 1;
    }
    95%,
    100% {
        stroke-dashoffset: 6;
        opacity: 0;
    }
}
</style>
