import { useMeetingStore } from '@/stores/meeting'

/**
 * 音频分析器 - 简化版
 *
 * 支持功能：
 * - 实时音量检测和说话状态识别
 * - 可配置的检测阈值和持续时间
 * - 音量变化和说话状态回调
 * - 音频流分析和频率数据获取
 */

/**
 * 音频分析器配置接口
 * @interface AudioAnalyzerConfig
 * @description 配置音频分析器的各种参数
 */
interface AudioAnalyzerConfig {
    /** 说话检测阈值 (0-255)，默认30 */
    speakingThreshold?: number
    /** 静音检测阈值 (0-255)，默认20 */
    silenceThreshold?: number
    /** 分析间隔时间 (ms)，默认100 */
    analysisInterval?: number
    /** FFT 大小，必须是2的幂，默认512 */
    fftSize?: number
    /** 平滑时间常数 (0-1)，默认0.8 */
    smoothingTimeConstant?: number
    /** 最小说话持续时间 (ms)，默认200 */
    minSpeakingDuration?: number
    /** 最小静音持续时间 (ms)，默认300 */
    minSilenceDuration?: number
}

/**
 * 音频分析结果接口
 * @interface AudioAnalysisResult
 * @description 包含音频分析的各种数据
 */
interface AudioAnalysisResult {
    /** 当前音量 (0-255) */
    volume: number
    /** 是否正在说话 */
    isSpeaking: boolean
    /** 平均音量 (0-255) */
    averageVolume: number
    /** 峰值音量 (0-255) */
    peakVolume: number
    /** 频率数据数组 */
    frequencyData: Uint8Array
}

/**
 * 说话状态变化事件接口
 * @interface SpeakingStateChangeEvent
 * @description 说话状态变化时触发的事件数据
 */
interface SpeakingStateChangeEvent {
    /** 是否正在说话 */
    isSpeaking: boolean
    /** 当前音量 */
    volume: number
    /** 持续时间 (ms) */
    duration: number
    /** 时间戳 */
    timestamp: number
}
/**
 * 音频分析器类
 * @class AudioAnalyzer
 * @description 用于实时分析音频流，检测音量变化和说话状态
 *
 * 主要功能：
 * - 实时音量检测和说话状态识别
 * - 可配置的检测阈值和持续时间
 * - 音量变化和说话状态回调
 * - 音频流分析和频率数据获取
 *
 * @example
 * ```typescript
 * const analyzer = new AudioAnalyzer({
 *   speakingThreshold: 30,
 *   silenceThreshold: 20
 * })
 * analyzer.setSpeakingCallback((event) => {
 *   console.log('说话状态变化:', event.isSpeaking)
 * })
 * analyzer.setup(audioStream)
 * ```
 */
class AudioAnalyzer {
    /** Web Audio API 音频上下文 */
    private audioContext: AudioContext | null = null
    /** 音频分析器节点 */
    private analyser: AnalyserNode | null = null
    /** 音频源节点 */
    private source: MediaStreamAudioSourceNode | null = null
    /** 频率数据数组 */
    private dataArray: Uint8Array | null = null
    /** 动画帧ID */
    private animationId: number | null = null
    /** 分析器配置 */
    private config: Required<AudioAnalyzerConfig>
    /** 说话状态变化回调 */
    private onSpeakingChange?: (event: SpeakingStateChangeEvent) => void
    /** 音量变化回调 */
    private onVolumeChange?: (volume: number) => void
    /** 是否正在分析 */
    private isAnalyzing = false
    /** 上次说话状态 */
    private lastSpeakingState = false
    /** 开始说话时间 */
    private speakingStartTime = 0
    /** 开始静音时间 */
    private silenceStartTime = 0
    /** 音量历史记录 */
    private volumeHistory: number[] = []
    /** 最大历史记录长度 */
    private readonly maxHistoryLength = 10

    /**
     * 构造函数
     * @param config 音频分析器配置，可选
     * @description 初始化音频分析器，设置默认配置参数
     */
    constructor(config: AudioAnalyzerConfig = {}) {
        this.config = {
            speakingThreshold: config.speakingThreshold || 30,
            silenceThreshold: config.silenceThreshold || 20,
            analysisInterval: config.analysisInterval || 100,
            fftSize: config.fftSize || 512,
            smoothingTimeConstant: config.smoothingTimeConstant || 0.8,
            minSpeakingDuration: config.minSpeakingDuration || 200,
            minSilenceDuration: config.minSilenceDuration || 300
        }
    }

    /**
     * 设置说话状态变化回调
     * @param callback 说话状态变化回调函数
     * @description 当检测到说话状态变化时调用此回调
     */
    setSpeakingCallback(callback: (event: SpeakingStateChangeEvent) => void) {
        this.onSpeakingChange = callback
    }

    /**
     * 设置音量变化回调
     * @param callback 音量变化回调函数
     * @description 当音量发生变化时调用此回调
     */
    setVolumeCallback(callback: (volume: number) => void) {
        this.onVolumeChange = callback
    }

    /**
     * 设置音频流并开始分析
     * @param stream 音频流
     * @returns 是否设置成功
     * @description 设置音频流并开始实时分析，创建音频上下文和分析器节点
     */
    setup(stream: MediaStream): boolean {
        try {
            this.destroy()

            const AudioContext = window.AudioContext || (window as any).webkitAudioContext
            this.audioContext = new AudioContext()
            this.source = this.audioContext.createMediaStreamSource(stream)
            this.analyser = this.audioContext.createAnalyser()
            this.analyser.fftSize = this.config.fftSize
            this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant

            this.source.connect(this.analyser)
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)

            this.startAnalysis()
            return true
        } catch (error) {
            console.error('音频分析器设置失败:', error)
            this.destroy()
            return false
        }
    }

    /**
     * 开始音频分析
     * @private
     * @description 启动音频分析循环，使用 requestAnimationFrame 进行实时分析
     */
    private startAnalysis() {
        if (this.isAnalyzing) return

        this.isAnalyzing = true
        this.lastSpeakingState = false
        this.speakingStartTime = 0
        this.silenceStartTime = 0
        this.volumeHistory = []

        const analyze = () => {
            if (!this.isAnalyzing || !this.analyser || !this.dataArray) return

            this.analyser.getByteFrequencyData(this.dataArray)
            const result = this.calculateVolume(this.dataArray)
            this.updateVolumeHistory(result.averageVolume)
            const isSpeaking = this.detectSpeaking(result)
            this.triggerCallbacks(result, isSpeaking)

            this.animationId = requestAnimationFrame(analyze)
        }

        analyze()
    }

    /**
     * 计算音量数据
     * @private
     * @param dataArray 频率数据数组
     * @returns 音频分析结果
     * @description 根据频率数据计算平均音量、峰值音量等指标
     */
    private calculateVolume(dataArray: Uint8Array): AudioAnalysisResult {
        const sum = dataArray.reduce((a, b) => a + b, 0)
        const average = sum / dataArray.length
        const peak = Math.max(...dataArray)

        return {
            volume: average,
            isSpeaking: false,
            averageVolume: average,
            peakVolume: peak,
            frequencyData: new Uint8Array(dataArray)
        }
    }

    /**
     * 更新音量历史记录
     * @private
     * @param volume 当前音量
     * @description 维护音量历史记录，用于计算平均音量
     */
    private updateVolumeHistory(volume: number) {
        this.volumeHistory.push(volume)
        if (this.volumeHistory.length > this.maxHistoryLength) {
            this.volumeHistory.shift()
        }
    }

    /**
     * 检测说话状态
     * @private
     * @param result 音频分析结果
     * @returns 是否正在说话
     * @description 根据音量阈值和持续时间判断是否正在说话
     */
    private detectSpeaking(result: AudioAnalysisResult): boolean {
        const currentTime = Date.now()
        const currentVolume = result.averageVolume
        const isCurrentlySpeaking = currentVolume > this.config.speakingThreshold

        if (isCurrentlySpeaking !== this.lastSpeakingState) {
            if (isCurrentlySpeaking) {
                this.speakingStartTime = currentTime
                this.silenceStartTime = 0
            } else {
                this.silenceStartTime = currentTime
                this.speakingStartTime = 0
            }
        }

        // 应用最小持续时间过滤
        if (isCurrentlySpeaking && this.speakingStartTime > 0) {
            const speakingDuration = currentTime - this.speakingStartTime
            if (speakingDuration < this.config.minSpeakingDuration) {
                return this.lastSpeakingState
            }
        }

        if (!isCurrentlySpeaking && this.silenceStartTime > 0) {
            const silenceDuration = currentTime - this.silenceStartTime
            if (silenceDuration < this.config.minSilenceDuration) {
                return this.lastSpeakingState
            }
        }

        this.lastSpeakingState = isCurrentlySpeaking
        return isCurrentlySpeaking
    }

    /**
     * 触发回调函数
     * @private
     * @param result 音频分析结果
     * @param isSpeaking 是否正在说话
     * @description 根据分析结果触发相应的回调函数
     */
    private triggerCallbacks(result: AudioAnalysisResult, isSpeaking: boolean) {
        result.isSpeaking = isSpeaking

        this.onVolumeChange?.(result.averageVolume)

        if (this.onSpeakingChange && isSpeaking !== this.lastSpeakingState) {
            const currentTime = Date.now()
            const duration = isSpeaking
                ? this.speakingStartTime > 0
                    ? currentTime - this.speakingStartTime
                    : 0
                : this.silenceStartTime > 0
                  ? currentTime - this.silenceStartTime
                  : 0

            this.onSpeakingChange({
                isSpeaking,
                volume: result.averageVolume,
                duration,
                timestamp: currentTime
            })
        }
    }

    /**
     * 获取当前音量级别
     * @returns 当前音量 (0-255)
     * @description 获取当前时刻的音量值
     * @example
     * ```typescript
     * const volume = analyzer.getCurrentVolume()
     * console.log('当前音量:', volume)
     * ```
     */
    getCurrentVolume(): number {
        if (!this.analyser || !this.dataArray) return 0

        this.analyser.getByteFrequencyData(this.dataArray)
        const sum = this.dataArray.reduce((a, b) => a + b, 0)
        return sum / this.dataArray.length
    }

    /**
     * 获取平均音量
     * @returns 平均音量 (0-255)
     * @description 获取历史记录的平均音量
     * @example
     * ```typescript
     * const avgVolume = analyzer.getAverageVolume()
     * console.log('平均音量:', avgVolume)
     * ```
     */
    getAverageVolume(): number {
        if (this.volumeHistory.length === 0) return 0
        return this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length
    }

    /**
     * 获取音量历史
     * @returns 音量历史数组的副本
     * @description 获取音量历史记录数组
     * @example
     * ```typescript
     * const history = analyzer.getVolumeHistory()
     * console.log('音量历史:', history)
     * ```
     */
    getVolumeHistory(): number[] {
        return [...this.volumeHistory]
    }

    /**
     * 更新配置
     * @param newConfig 新配置对象
     * @description 动态更新分析器配置参数
     * @example
     * ```typescript
     * analyzer.updateConfig({
     *   speakingThreshold: 40,
     *   silenceThreshold: 25
     * })
     * ```
     */
    updateConfig(newConfig: Partial<AudioAnalyzerConfig>) {
        this.config = { ...this.config, ...newConfig }

        if (this.analyser) {
            if (newConfig.fftSize) {
                this.analyser.fftSize = newConfig.fftSize
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
            }
            if (newConfig.smoothingTimeConstant !== undefined) {
                this.analyser.smoothingTimeConstant = newConfig.smoothingTimeConstant
            }
        }
    }

    /**
     * 暂停分析
     * @description 暂停音频分析，停止数据采集
     * @example
     * ```typescript
     * analyzer.pause()
     * console.log('音频分析已暂停')
     * ```
     */
    pause() {
        this.isAnalyzing = false
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    /**
     * 恢复分析
     * @description 恢复音频分析，重新开始数据采集
     * @example
     * ```typescript
     * analyzer.resume()
     * console.log('音频分析已恢复')
     * ```
     */
    resume() {
        if (!this.isAnalyzing && this.analyser && this.dataArray) {
            this.startAnalysis()
        }
    }

    /**
     * 检查是否正在分析
     * @returns 是否正在分析
     * @description 检查分析器是否处于活跃状态
     * @example
     * ```typescript
     * if (analyzer.isActive()) {
     *   console.log('音频分析器正在运行')
     * }
     * ```
     */
    isActive(): boolean {
        return this.isAnalyzing && this.analyser !== null
    }

    /**
     * 销毁音频分析器
     * @description 清理所有资源，断开音频连接
     * @example
     * ```typescript
     * // 在组件销毁时调用
     * analyzer.destroy()
     * ```
     */
    destroy() {
        this.isAnalyzing = false

        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }

        if (this.source) {
            this.source.disconnect()
            this.source = null
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close()
            this.audioContext = null
        }

        this.analyser = null
        this.dataArray = null
        this.volumeHistory = []
        this.lastSpeakingState = false
        this.speakingStartTime = 0
        this.silenceStartTime = 0
    }
}

/**
 * 音频管理器
 * 负责处理音频分析、说话检测等功能
 */
/**
 * 音频管理器
 * @class AudioManager
 * @description 提供对 `AudioAnalyzer` 的高级封装，与会议 Store 打通，实现本地说话状态上报。
 */
export class AudioManager {
    private audioAnalyzer: AudioAnalyzer
    private meetingStore = useMeetingStore()

    /**
     * 构造函数
     * @constructor
     */
    constructor() {
        this.audioAnalyzer = new AudioAnalyzer()
        this.setupSpeakingCallback()
    }

    /**
     * 设置说话检测回调
     * @private
     * @description 侦听说话状态并同步更新到会议 Store。
     */
    private setupSpeakingCallback() {
        this.audioAnalyzer.setSpeakingCallback(event => {
            this.meetingStore.setLocalSpeaking(event.isSpeaking)
        })
    }

    /**
     * 设置音频流
     * @param {MediaStream} stream 媒体流（仅需包含音频轨）
     * @returns {void}
     * @description 传入音频流并启动分析。
     */
    setup(stream: MediaStream) {
        this.audioAnalyzer.setup(stream)
    }

    /**
     * 销毁音频分析器
     * @returns {void}
     * @description 释放分析器资源。
     */
    destroy() {
        this.audioAnalyzer.destroy()
    }
}

export default AudioAnalyzer
export type { AudioAnalyzerConfig, AudioAnalysisResult, SpeakingStateChangeEvent }
