import { defineStore } from 'pinia'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
    isLoggedIn,
    getToken,
    loginTokens,
    logoutTokens,
    refreshTokens as refreshTokensUtil,
    TOKEN_TYPE
} from '../utils/auth'
import { tokenSyncManager } from '../utils/token-sync'
import router from '@/router'

export const useAuthStore = defineStore(
    'auth',
    () => {
        // 状态
        const accessToken = ref<string | null>(getToken(TOKEN_TYPE.ACCESS))
        const refreshToken = ref<string | null>(getToken(TOKEN_TYPE.REFRESH))
        const user = ref<any>(null)

        // 计算属性
        const isAuthenticated = computed(() => {
            return !!accessToken.value && accessToken.value.trim() !== ''
        })

        // 方法
        const login = (newAccessToken: string, newRefreshToken: string, userData?: any) => {
            accessToken.value = newAccessToken
            refreshToken.value = newRefreshToken
            loginTokens(newAccessToken, newRefreshToken)

            // 广播登录成功消息到其他标签页
            tokenSyncManager.broadcastTokenUpdate(newAccessToken, newRefreshToken)

            if (userData) {
                user.value = userData
            }
        }

        const logout = () => {
            accessToken.value = null
            refreshToken.value = null
            user.value = null

            // 广播登出消息到其他标签页
            tokenSyncManager.broadcastLogout()
            logoutTokens()
        }

        const updateUser = (userData: any) => {
            user.value = userData
        }

        const refreshTokens = (newAccessToken: string, newRefreshToken?: string) => {
            accessToken.value = newAccessToken
            if (newRefreshToken) {
                refreshToken.value = newRefreshToken
            }
            // 调用工具函数刷新 token
            refreshTokensUtil(newAccessToken, newRefreshToken)

            // 广播token刷新消息到其他标签页
            tokenSyncManager.broadcastTokenUpdate(newAccessToken, newRefreshToken)
        }

        // 初始化时检查登录状态
        const initAuth = () => {
            if (isLoggedIn()) {
                accessToken.value = getToken(TOKEN_TYPE.ACCESS)
                refreshToken.value = getToken(TOKEN_TYPE.REFRESH)
            }
        }
        // ---------------------------------------------------------
        // 设置跨标签页事件监听器
        const setupCrossTabListeners = () => {
            // 监听token更新事件
            const handleTokenUpdate = (event: CustomEvent) => {
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = event.detail
                accessToken.value = newAccessToken
                if (newRefreshToken) {
                    refreshToken.value = newRefreshToken
                }
                console.log('从其他标签页同步更新了token')

                // router.go(0)
            }

            // 监听token过期事件
            const handleTokenExpired = () => {
                accessToken.value = null
                refreshToken.value = null
                user.value = null
                console.log('从其他标签页同步处理了token过期')

                router.push({ name: 'login-page' })
            }

            // 监听用户登出事件
            const handleUserLogout = () => {
                accessToken.value = null
                refreshToken.value = null
                user.value = null
                console.log('从其他标签页同步处理了用户登出')

                router.push({ name: 'login-page' })
            }

            // 监听token状态检查事件
            const handleTokenStatusCheck = () => {
                // 重新检查token状态
                initAuth()
            }

            // 添加事件监听器
            window.addEventListener('token-updated', handleTokenUpdate as EventListener)
            window.addEventListener('token-expired', handleTokenExpired)
            window.addEventListener('user-logout', handleUserLogout)
            window.addEventListener('token-status-check', handleTokenStatusCheck)

            // 返回清理函数
            return () => {
                window.removeEventListener('token-updated', handleTokenUpdate as EventListener)
                window.removeEventListener('token-expired', handleTokenExpired)
                window.removeEventListener('user-logout', handleUserLogout)
                window.removeEventListener('token-status-check', handleTokenStatusCheck)
            }
        }

        return {
            // 状态
            accessToken,
            refreshToken,
            user,
            // 计算属性
            isAuthenticated,
            // 方法
            login,
            logout,
            updateUser,
            refreshTokens,
            initAuth,
            setupCrossTabListeners
        }
    },
    {
        persist: true
    }
)
