import axios, { type AxiosResponse, type AxiosError } from 'axios'
import { isLoggedIn, getToken, refreshTokens, logoutTokens, TOKEN_TYPE } from '../utils/auth'
import router from '../router'
import { tokenSyncManager } from '../utils/token-sync'

const request = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000
})

/** 模块一：处理token的请求订阅（单例 Hook 风格） */
const useRefreshSubscribers = () => {
    // Token刷新订阅者类型定义
    type RefreshSubscriber = (newToken: string | null) => void

    // 刷新订阅者数组（模块级变量，确保在整个应用生命周期中保持状态）
    let refreshSubscribers: Array<RefreshSubscriber> = []

    // 私有实现函数，仅在本模块内使用
    function innerSubscribeTokenRefresh(cb: RefreshSubscriber): void {
        refreshSubscribers.push(cb)
    }

    function innerBroadcastRefreshed(newToken: string | null): void {
        const subscribers = [...refreshSubscribers]
        refreshSubscribers = []
        subscribers.forEach(cb => cb(newToken))
    }

    return {
        subscribeTokenRefresh: innerSubscribeTokenRefresh,
        broadcastRefreshed: innerBroadcastRefreshed
    }
}
const { subscribeTokenRefresh, broadcastRefreshed } = useRefreshSubscribers()

/** 模块二：处理401刷新操作 */
const useUnauthorized = () => {
    const REFRESH_ENDPOINT = '/auths/refresh' // 刷新 token 的接口
    let isRefreshing = false // 是否在刷新操作

    /**
     * 刷新接口获取新token（使用基础 axios，避免被拦截器影响）
     * @returns {Promise<string>} 新的 access_token
     */
    async function onRefreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
        const baseURL = import.meta.env.VITE_API_URL as string
        const refreshToken = getToken(TOKEN_TYPE.REFRESH)
        if (!refreshToken) throw new Error('缺少 refresh token')

        try {
            const { data } = await axios.post(
                `${baseURL}${REFRESH_ENDPOINT}`,
                { refresh_token: refreshToken },
                { timeout: 5000 }
            )
            // console.log('刷新token---', data)
            const newAccessToken = data?.data?.access_token
            const newRefreshToken = data?.data?.refresh_token

            if (!newAccessToken) throw new Error('刷新接口未返回 access_token')
            refreshTokens(newAccessToken, newRefreshToken)

            return { accessToken: newAccessToken, refreshToken: newRefreshToken }
        } catch {
            throw new Error('刷新 token 失败')
        }
    }

    // 处理401
    async function handleUnauthorized(error: any) {
        // 获取请求配置
        const originalRequest = error.config || {}
        // 是否是刷新token的请求（区分普通请求和刷新请求，仅对普通请求执行刷新逻辑）
        const isRefreshRequest = (originalRequest?.url || '').includes(REFRESH_ENDPOINT)
        /**
         * _isRetry 用于标记该请求是否已经因为 401 错误被重试过一次。
         * 这样可以防止在刷新 token 失败或刷新接口本身返回 401 时，出现无限循环重试的情况。
         * 如果 _isRetry 为 true，说明该请求已经重试过，直接登出并跳转登录页。
         * isRefreshRequest 用于判断当前请求是否为刷新 token 的请求，刷新请求出错也直接登出。
         */
        if (originalRequest._isRetry || isRefreshRequest) {
            // 广播登出消息到其他标签页
            tokenSyncManager.broadcastLogout()
            logoutTokens()

            router.push({ name: 'login-page' })
            return Promise.reject(error)
        }

        // 标记是否是普通请求，允许执行刷新逻辑
        originalRequest._isRetry = true

        // 先订阅当前请求，等待刷新完成后再重放
        const retryOriginalRequestPromise = new Promise((resolve, reject) => {
            subscribeTokenRefresh((newToken: string | null) => {
                if (!newToken) {
                    reject(error)
                    return
                }
                try {
                    originalRequest.headers = originalRequest.headers || {}
                    originalRequest.headers.Authorization = `Bearer ${newToken}`
                    resolve(request(originalRequest))
                } catch (err) {
                    reject(err)
                }
            })
        })

        // 如果没有在刷新，则触发一次刷新（异步执行）
        if (!isRefreshing) {
            try {
                isRefreshing = true
                const { accessToken, refreshToken } = await onRefreshToken()

                // 广播token更新消息到其他标签页
                tokenSyncManager.broadcastTokenUpdate(accessToken, refreshToken)
                broadcastRefreshed(accessToken)
            } catch (error) {
                // 广播token过期消息到其他标签页
                tokenSyncManager.broadcastTokenExpired()
                broadcastRefreshed(null)
                logoutTokens()
                router.push({ name: 'login-page' })
            } finally {
                isRefreshing = false
            }
        }

        // 返回当前请求的重放承诺
        return retryOriginalRequestPromise
    }

    return { handleUnauthorized, onRefreshToken }
}
const { handleUnauthorized } = useUnauthorized()

/**
 * 处理响应错误
 * @param error 响应错误
 */
async function handleResponseError(error: AxiosError) {
    console.log('error', error)
    if (error.response) {
        const { status } = error.response
        if (status === 401) return handleUnauthorized(error)
        if (status === 403) throw new Error('没有权限访问该资源')
        if (status >= 500) throw new Error('服务器错误')
    }
    return Promise.reject(error)
}

// ====================== 拦截器 =====================

// 请求拦截器
request.interceptors.request.use(config => {
    if (isLoggedIn()) {
        const token = getToken(TOKEN_TYPE.ACCESS)
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// 响应拦截器
request.interceptors.response.use(
    (res: AxiosResponse) => {
        return res.data
    },
    (err: AxiosError) => handleResponseError(err)
)

export default request
