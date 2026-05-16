import { ref } from 'vue'
import lottie, { type AnimationItem } from 'lottie-web'
import starAnimationData from './stars-animation.json'
import loadingAnimationData from './search-animation.json'

/**
 * Lottie 动画封装：负责初始化、播放/暂停、销毁与根据 loading 切换动画数据
 */
export function useLottieAnimation() {
    // 容器 ref
    const lottieContainer = ref<HTMLDivElement | null>(null)
    // Lottie 动画实例引用（需要在销毁时手动释放）
    let lottieAnimation: AnimationItem | null = null

    /**
     * 初始化 Lottie 动画
     * @param loading 是否为加载态（加载态使用搜索动画；非加载态使用星星动画）
     */
    const init = (loading: boolean): void => {
        const container = lottieContainer.value
        if (!container) return

        try {
            lottieAnimation = lottie.loadAnimation({
                container,
                renderer: 'svg',
                loop: true,
                autoplay: loading,
                animationData: loading ? loadingAnimationData : starAnimationData
            })

            if (lottieAnimation) {
                // 减少子帧渲染以稳定表现
                lottieAnimation.setSubframe(false)
                if (loading) {
                    // loading 状态下持续自动播放
                    lottieAnimation.play()
                } else {
                    // 非 loading 显示第一帧，等待悬停触发
                    lottieAnimation.goToAndStop(0, true)
                }
            }
        } catch (error) {
            console.error('Lottie 动画初始化失败:', error)
        }
    }

    /**
     * 控制Lottie 动画的播放与暂停
     * @param type 'play' | 'pause'
     * @returns
     */
    const handleAnimation = (type: 'play' | 'pause' = 'play') => {
        if (!lottieAnimation) return

        if (type === 'play') {
            lottieAnimation.play()
        } else {
            lottieAnimation.pause()
        }
    }

    /**
     * 销毁动画
     */
    const destroy = (): void => {
        if (lottieAnimation) {
            lottieAnimation.destroy()
            lottieAnimation = null
        }
    }

    /**
     * 重新加载动画数据
     * @param loading 是否加载态
     */
    const reload = (loading: boolean): void => {
        destroy()
        init(loading)
    }

    return {
        // 容器 ref
        lottieContainer,
        init,
        handleAnimation,
        destroy,
        reload
    }
}
