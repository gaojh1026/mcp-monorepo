import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * 轮询配置选项接口
 */
interface IPollingOptions<T = unknown> {
    /** 轮询函数 */
    pollingFn: () => Promise<T>
    /** 轮询间隔（毫秒），默认1000ms */
    interval?: number
    /** 最大轮询次数，默认100次 */
    maxCount?: number
    /** 是否立即执行，默认true */
    immediate?: boolean
    /** 轮询条件，返回false时停止轮询 */
    condition?: () => boolean
    /** 轮询成功回调 */
    onSuccess?: (data: T) => void
    /** 轮询失败回调 */
    onError?: (error: unknown) => void
    /** 轮询完成回调（达到最大次数或条件不满足时） */
    onComplete?: () => void
}

/**
 * 轮询Hook
 * @param options 轮询配置选项
 * @returns 轮询相关的状态和方法
 */
export function usePolling<T = unknown>(options: IPollingOptions<T>) {
    const {
        pollingFn,
        interval = 1000,
        maxCount = 100,
        immediate = true,
        condition,
        onSuccess,
        onError,
        onComplete
    } = options

    const isPolling = ref(false) // 是否正在轮询
    const isPaused = ref(false) // 是否暂停
    const count = ref(0) // 轮询次数
    const timer = ref<NodeJS.Timeout | null>(null) // 轮询定时器
    const data = ref<T | null>(null) // 轮询数据
    const error = ref<unknown>(null) // 轮询错误

    /**
     * 执行轮询
     */
    const polling = async () => {
        // 检查是否暂停
        if (isPaused.value) return

        // 检查轮询条件
        if (condition && !condition()) {
            console.log('轮询条件不满足,结束轮询')
            stopPolling()
            onComplete?.()
            return
        }

        // 检查最大轮询次数
        if (count.value >= maxCount) {
            stopPolling()
            onComplete?.()
            console.log('达到最大轮询次数')
            return
        }

        try {
            count.value++
            console.log('polling number', count.value)
            data.value = await pollingFn()
            error.value = null
            onSuccess?.(data.value)
        } catch (err) {
            error.value = err
            onError?.(err)
        }
    }

    /**
     * 开始轮询
     */
    const startPolling = () => {
        console.log('startPolling')
        if (isPolling.value) return

        isPolling.value = true
        isPaused.value = false
        count.value = 0
        error.value = null

        timer.value = setInterval(() => {
            if (!isPolling.value || isPaused.value) return
            polling()
        }, interval)
    }

    /**
     * 停止轮询
     */
    const stopPolling = () => {
        isPolling.value = false
        isPaused.value = false

        if (timer.value) {
            clearInterval(timer.value)
            timer.value = null
        }
        console.log('stopPolling---')
    }

    /**
     * 重置轮询
     */
    const resetPolling = () => {
        stopPolling()
        startPolling()
    }

    /**
     * 暂停轮询
     */
    const pausePolling = () => {
        isPaused.value = true
    }

    /**
     * 恢复轮询
     */
    const resumePolling = () => {
        isPaused.value = false
    }

    // 组件挂载时执行
    if (immediate) {
        startPolling()
    }

    // 组件卸载时清理
    onUnmounted(() => {
        console.log('销毁轮询hook')
        stopPolling()
    })

    return {
        isPolling,
        count,
        data,
        error,
        startPolling,
        stopPolling,
        resetPolling,
        pausePolling,
        resumePolling
    }
}
