import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

/** 会议间-配置相关 */

/**
 * @interface MeetingConfig
 * @description 会议配置接口
 * @property {string} roomId - 房间ID
 * @property {string} userId - 用户ID
 * @property {string} userName - 用户名称
 * @property {string} serverUrl - 服务器URL
 * @property {boolean} autoJoin - 是否自动加入
 * @property {boolean} enableDebug - 是否启用调试
 */
export interface MeetingConfig {
    roomId: string
    userId: string
    userName?: string
    serverUrl: string
    autoJoin: boolean
    enableDebug: boolean
}

/** 会议间 - 配置 - 状态管理 */
export const useMeetingConfigStore = defineStore('meeting-config', () => {
    // 基础配置
    const config = reactive<MeetingConfig>({
        roomId: '',
        userId: '',
        userName: '',
        serverUrl: 'ws://localhost:8998',
        autoJoin: false,
        enableDebug: true
    })

    // ------------------------计算属性------------------------
    // 当前用户信息
    const currentUser = computed(() => ({
        id: config.userId,
        name: config.userName || `用户_${config.userId.slice(-6)}`,
        isLocal: true
    }))

    /**
     * 设置会议配置
     * @param newConfig 新的配置信息
     */
    const setConfig = (newConfig: Partial<MeetingConfig>) => {
        Object.assign(config, newConfig)
    }

    /**
     * 设置房间ID
     * @param roomId 房间ID
     */
    const setRoomId = (roomId: string) => {
        config.roomId = roomId
    }

    /**
     * 设置用户ID
     * @param userId 用户ID
     */
    const setUserId = (userId: string) => {
        config.userId = userId
    }

    /**
     * 设置用户名
     * @param userName 用户名
     */
    const setUserName = (userName: string) => {
        config.userName = userName
    }

    /**
     * 设置信令服务器URL
     * @param serverUrl 服务器URL
     */
    const setServerUrl = (serverUrl: string) => {
        config.serverUrl = serverUrl
    }

    /**
     * 切换调试模式
     * @param enabled 是否启用调试
     */
    const toggleDebug = (enabled?: boolean) => {
        config.enableDebug = enabled !== undefined ? enabled : !config.enableDebug
    }

    /**
     * 重置会议配置
     */
    const resetConfig = () => {
        Object.assign(config, {
            roomId: '',
            userId: '',
            userName: '',
            serverUrl: 'ws://localhost:8998',
            autoJoin: false,
            enableDebug: true
        })
    }

    return {
        config,
        currentUser,
        setConfig,
        setRoomId,
        setUserId,
        setUserName,
        setServerUrl,
        toggleDebug,
        resetConfig
    }
})
