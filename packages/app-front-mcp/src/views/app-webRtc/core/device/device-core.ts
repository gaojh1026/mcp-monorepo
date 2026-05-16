/** 设备管理核心 */
// ======================= 类型定义 =======================

/**
 * 设备选项接口
 * @description 用于设备选择下拉框的选项数据结构
 */
interface DeviceOption {
    /** 设备显示标签 */
    label: string
    /** 设备唯一标识符 */
    value: string
    /** 设备类型：音频输入、音频输出、视频输入 */
    kind: MediaDeviceKind
    /** 是否为默认设备 */
    isDefault?: boolean
}

/**
 * 设备状态接口
 * @description 存储当前选中的设备和权限状态
 */
interface DeviceState {
    /** 当前选中的麦克风设备ID */
    selectedMic?: string
    /** 当前选中的摄像头设备ID */
    selectedCam?: string
    /** 当前选中的扬声器设备ID */
    selectedSpeaker?: string
    /** 设备权限状态 */
    permissions: {
        /** 音频设备权限状态 */
        audio: PermissionState
        /** 视频设备权限状态 */
        video: PermissionState
    }
}

/**
 * 设备管理器配置接口
 * @description 设备管理器初始化配置
 */
interface DeviceManagerConfig {
    /** 设备变化回调 */
    onDeviceChange?: (stream: MediaStream) => Promise<void>
    /** 设备列表变化回调 */
    onDeviceListChange?: (devices: MediaDeviceInfo[]) => void
    /** 错误回调 */
    onError?: (error: Error) => void
}

/**
 * 设备变化事件类型
 * @description 设备添加、移除或变化时触发的事件类型
 */
type DeviceChangeEvent = 'deviceadded' | 'deviceremoved' | 'devicechanged'

export type { DeviceOption, DeviceState, DeviceChangeEvent, DeviceManagerConfig }

// ======================= 设备管理器类 =======================

/**
 * 设备管理器类
 * @description 负责管理音视频设备的枚举、切换、权限检查和状态监听
 *
 * 主要功能：
 * - 枚举音视频设备（麦克风、摄像头、扬声器）
 * - 设备切换和权限检查
 * - 设备变化监听
 * - 音频输出设备设置
 * - 设备可用性检查
 */
export class DeviceCore {
    // ======================= 私有属性 =======================
    /** 设备缓存列表 */
    private deviceCache: MediaDeviceInfo[] = []
    /** 当前设备状态 */
    private deviceState: DeviceState = {
        permissions: { audio: 'prompt', video: 'prompt' }
    }
    /** 设备变化监听器 */
    private deviceChangeListener?: () => void

    // ======================= 公共属性 =======================
    /** 设备变化时的回调函数 */
    onDeviceChange?: (stream: MediaStream) => Promise<void>
    /** 设备列表变化时的回调函数 */
    onDeviceListChange?: (devices: MediaDeviceInfo[]) => void
    /** 错误回调 */
    onError?: (error: Error) => void

    // ======================= 构造函数 =======================
    constructor(config: DeviceManagerConfig = {}) {
        this.onDeviceChange = config.onDeviceChange
        this.onDeviceListChange = config.onDeviceListChange
        this.onError = config.onError

        // 执行初始化检查
        this.checkPermissions()
        this.onDeviceChangeListener()
    }

    // ======================= 权限检查 =======================
    /**
     * 检查设备权限
     * @private
     * @description 检查麦克风和摄像头的权限状态
     */
    async checkPermissions() {
        try {
            if ('permissions' in navigator) {
                const [audioPermission, videoPermission] = await Promise.all([
                    navigator.permissions.query({ name: 'microphone' as PermissionName }),
                    navigator.permissions.query({ name: 'camera' as PermissionName })
                ])
                this.deviceState.permissions = {
                    audio: audioPermission.state,
                    video: videoPermission.state
                }
            }
        } catch (error) {
            console.warn('权限检查失败:', error)
            this.onError?.(error as Error)
        }
    }

    // ======================= 设备枚举 =======================
    /**
     * 获取设备列表
     * @param forceRefresh 是否强制刷新设备列表，默认为false
     * @returns 包含麦克风、摄像头、扬声器选项的对象
     * @description 获取所有可用的音视频设备并格式化为选项列表
     */
    async getDevicesList(forceRefresh = false) {
        try {
            if (this.deviceCache.length === 0 || forceRefresh) {
                await this.refreshDeviceList()
            }

            const devices = this.deviceCache
            const createOptions = (kind: MediaDeviceKind, prefix: string) =>
                devices
                    .filter(d => d.kind === kind)
                    .map((d, index) => ({
                        label: d.label || `${prefix} ${d.deviceId.slice(0, 8)}`,
                        value: d.deviceId,
                        kind: d.kind,
                        isDefault: index === 0
                    }))

            return {
                micOptions: createOptions('audioinput', '麦克风'),
                camOptions: createOptions('videoinput', '摄像头'),
                speakerOptions: createOptions('audiooutput', '扬声器')
            }
        } catch (error) {
            console.error('获取设备列表失败:', error)
            return { micOptions: [], camOptions: [], speakerOptions: [] }
        }
    }

    /**
     * 获取设备详细信息
     * @param deviceId 设备ID
     * @returns 设备详细信息或null
     * @description 根据设备ID获取设备的详细信息
     */
    getDeviceInfo(deviceId: string): MediaDeviceInfo | null {
        return this.deviceCache.find(device => device.deviceId === deviceId) || null
    }

    /**
     * 获取设备状态
     * @returns 设备状态
     * @description 获取设备状态
     */
    getDeviceState(): DeviceState {
        return this.deviceState
    }

    /**
     * 刷新设备列表
     * @private
     * @description 重新枚举所有媒体设备并更新缓存
     */
    async refreshDeviceList() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            this.deviceCache = devices
            this.onDeviceListChange?.(devices)
        } catch (error) {
            console.error('刷新设备列表失败:', error)
        }
    }

    // ======================= 设备可用性检查 =======================
    /**
     * 检查设备是否可用
     * @param deviceId 设备ID
     * @param kind 设备类型
     * @returns 设备是否可用
     * @description 检查指定ID和类型的设备是否在系统中可用
     */
    async isDeviceAvailable(deviceId: string, kind: MediaDeviceKind): Promise<boolean> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            return devices.some(device => device.deviceId === deviceId && device.kind === kind)
        } catch (error) {
            console.error('检查设备可用性失败:', error)
            return false
        }
    }

    // ======================= 设备应用 =======================
    /**
     * 应用设备设置
     * @param selectedMic 选中的麦克风设备ID
     * @param selectedCam 选中的摄像头设备ID
     * @param selectedSpeaker 选中的扬声器设备ID
     * @returns 是否应用成功
     * @description 应用指定的设备设置并获取媒体流
     */
    async applyDevices({
        selectedMic,
        selectedCam,
        selectedSpeaker
    }: {
        selectedMic?: string
        selectedCam?: string
        selectedSpeaker?: string
    }) {
        try {
            this.onDeviceChange?.(undefined as any)

            const constraints: MediaStreamConstraints = {
                audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
                video: selectedCam ? { deviceId: { exact: selectedCam } } : true
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)

            this.deviceState.selectedMic = selectedMic
            this.deviceState.selectedCam = selectedCam
            this.deviceState.selectedSpeaker = selectedSpeaker

            // 设置音频输出设备
            if (selectedSpeaker) {
                await this.setAudioOutputDevice(selectedSpeaker)
            }

            await this.onDeviceChange?.(stream)
            return true
        } catch (error) {
            console.error('设备切换失败:', error)
            return false
        }
    }

    /**
     * 设置音频输出设备
     * @param deviceId 音频输出设备ID
     * @returns 是否设置成功
     * @description 设置所有audio元素的音频输出设备
     */
    async setAudioOutputDevice(deviceId: string): Promise<boolean> {
        try {
            const isAvailable = await this.isDeviceAvailable(deviceId, 'audiooutput')
            if (!isAvailable) {
                console.warn('指定的音频输出设备不可用:', deviceId)
                return false
            }

            if ('setSinkId' in HTMLAudioElement.prototype) {
                const audioElements = document.querySelectorAll('audio')
                await Promise.all(
                    Array.from(audioElements).map(audio =>
                        (audio as any).setSinkId(deviceId).catch((error: any) => {
                            console.warn('设置音频输出设备失败:', error)
                        })
                    )
                )
                return true
            }
            return false
        } catch (error) {
            console.error('设置音频输出设备失败:', error)
            return false
        }
    }

    // ======================= 事件监听 =======================
    /**
     * 设置设备变化监听器
     * @private
     * @description 监听设备变化事件，当设备添加、移除或变化时自动刷新设备列表
     */
    onDeviceChangeListener() {
        if (navigator.mediaDevices?.addEventListener) {
            this.deviceChangeListener = () => this.refreshDeviceList()
            navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeListener)
        }
    }

    // ======================= 资源清理 =======================
    /**
     * 清理资源
     * @description 移除事件监听器并清理所有缓存数据
     */
    destroy() {
        if (this.deviceChangeListener && navigator.mediaDevices?.removeEventListener) {
            navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeListener)
        }
        this.deviceCache = []
        this.onDeviceChange = undefined
        this.onDeviceListChange = undefined
    }
}
