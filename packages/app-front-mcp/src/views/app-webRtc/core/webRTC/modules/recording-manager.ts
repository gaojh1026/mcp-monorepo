/** 录制功能管理器 */

import type { IRecordingManager, RecordCallback, RecordingOptions } from '../types'

/** 录制所需依赖 */
export interface RecordingDeps {
    getStream: (streamType: 'local' | 'screen') => MediaStream | undefined
    recordingOptions?: RecordingOptions
}

/**
 * 录制管理器
 * 负责处理媒体流的录制功能
 */
export class RecordingManager implements IRecordingManager {
    /** 录制器实例 */
    private recorder: MediaRecorder | null = null
    /** 是否正在录制 */
    private recording: boolean = false
    /** 录制选项 */
    private recordingOptions: MediaRecorderOptions
    /** 录制回调 */
    onRecord: RecordCallback = () => {}
    /** 依赖集合 */
    private deps: RecordingDeps

    constructor(deps: RecordingDeps) {
        this.deps = deps
        this.recordingOptions = {
            mimeType: 'video/webm; codecs=vp9',
            ...deps.recordingOptions
        }
    }

    /**
     * 开始录制（MediaRecorder）
     * @param streamType 录制对象：'local' 本地流 | 'screen' 屏幕流
     * @returns {Promise<boolean>} 录制是否成功
     */
    async startRecording(streamType: 'local' | 'screen' = 'local'): Promise<boolean> {
        const stream = this.deps.getStream(streamType)

        if (!stream) {
            const errMsg = '录制流不存在'
            this.onRecord({ status: 'error', blob: null })
            throw new Error(errMsg)
        }

        try {
            this.recorder = new MediaRecorder(stream, this.recordingOptions)
            const chunks: BlobPart[] = []
            let recordingStatus = 'started'

            this.recorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    chunks.push(event.data)
                }
            }

            // 录制暂停回调
            this.recorder.onpause = () => {
                recordingStatus = 'paused'
                this.onRecord({ status: recordingStatus, blob: null })
            }

            // 录制恢复回调
            this.recorder.onresume = () => {
                recordingStatus = 'resumed'
                this.onRecord({ status: recordingStatus, blob: null })
            }

            // 录制错误回调
            this.recorder.onerror = (event: any) => {
                recordingStatus = 'error'
                this.onRecord({ status: recordingStatus, blob: null })
            }

            // 录制停止回调
            this.recorder.onstop = () => {
                recordingStatus = 'stopped'
                const blob = new Blob(chunks, { type: this.recordingOptions.mimeType })
                this.onRecord({ status: recordingStatus, blob })
                chunks.length = 0
            }

            // 开始录制
            this.recorder.start()
            this.recording = true
            this.onRecord({ status: recordingStatus, blob: null })
            return true
        } catch (error) {
            // 录制失败
            this.onRecord({ status: 'error', blob: null })
            console.error('录制启动失败:', error)
            return false
        }
    }

    /**
     * 暂停录制
     * @returns
     */
    async pauseRecording(): Promise<boolean> {
        if (this.recorder && this.recording) {
            this.recorder.pause()
            this.recording = false
            return true
        }
        return false
    }

    /**
     * 恢复录制
     * @returns
     */
    async resumeRecording(): Promise<boolean> {
        if (this.recorder && !this.recording) {
            this.recorder.resume()
            this.recording = true
            return true
        }
        return false
    }

    /**
     * 停止录制
     * @returns
     */
    async stopRecording(): Promise<boolean> {
        if (this.recorder && this.recording) {
            this.recorder.stop()
            this.recording = false
            return true
        }
        return false
    }

    /**
     * 获取录制状态
     * @returns
     */
    getRecordingStatus(): boolean {
        return this.recording
    }
}
