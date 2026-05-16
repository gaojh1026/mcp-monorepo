import { nextTick, reactive } from 'vue'
import { useMeetingStore } from '@/stores/meeting'
import { WebRTCManager } from '../core/webRTC'
import { ErrorHandler } from './common-utils'

/**
 * 视频管理配置接口
 */
export interface VideoManagerConfig {
    webRTCManager: WebRTCManager
    dom: {
        mainVideoDom: () => HTMLMediaElement | null | undefined
        localVideoDom: () => HTMLMediaElement | null | undefined
    }
}

/**
 * 视频管理器
 * 负责处理视频流的绑定、显示和状态管理
 */
export class VideoManager {
    private meetingStore = useMeetingStore()
    private config: VideoManagerConfig
    /** 远程视频引用 */
    private remoteVideoRefs = reactive<Record<string, HTMLVideoElement | null>>({})

    constructor(config: VideoManagerConfig) {
        this.config = config
    }

    /**
     * 设置远程视频引用
     * @param participantId 参与者ID
     */
    setRemoteRef(participantId: string) {
        this.remoteVideoRefs[participantId] = null

        // 如果已经有远程流，立即绑定
        if (this.meetingStore.remoteStreams[participantId]) {
            nextTick(() => {
                this.refreshAfterRemoteStateChange(participantId)
            })
        }
    }

    /**
     * 绑定主视频流到主播放器
     */
    bindMainVideo() {
        nextTick(() => {
            const dom = this.config.dom.mainVideoDom()
            if (!dom) {
                console.warn('主视频元素不存在')
                return
            }

            const mainStream = this.getMainStream()
            console.log('绑定主视频---', mainStream)
            this.setMediaElementStream(dom, mainStream)
        })
    }

    /**
     * 绑定本地视频流到本地播放器
     */
    bindLocalVideo() {
        nextTick(() => {
            const dom = this.config.dom.localVideoDom()
            if (!dom) {
                console.warn('本地视频元素不存在')
                return
            }

            const mainStream = this.getMainStream()
            console.log('绑定本地视频----', mainStream)
            this.setMediaElementStream(dom, mainStream)
        })
    }

    /**
     * 绑定指定参与者的远程视频流
     * @param participantId 参与者ID
     * @returns
     */
    bindRemoteVideo(participantId: string) {
        const el = this.remoteVideoRefs[participantId]
        if (!el) {
            console.warn('远程视频元素不存在:', participantId)
            return
        }

        const stream = this.meetingStore.remoteStreams[participantId]
        this.setMediaElementStream(el, stream || null)
    }

    /**
     * 获取主视频流（优先显示活跃说话者的视频）
     */
    getMainStream(): MediaStream | null {
        const ids = Object.keys(this.meetingStore.remoteStreams)

        // 优先显示活跃说话者的视频
        if (
            this.meetingStore.webRTCState.activeSpeakerId &&
            this.meetingStore.remoteStreams[this.meetingStore.webRTCState.activeSpeakerId]
        ) {
            return this.meetingStore.remoteStreams[this.meetingStore.webRTCState.activeSpeakerId]
        }

        // 其次显示第一个远程视频
        if (ids.length > 0 && this.meetingStore.remoteStreams[ids[0]]) {
            return this.meetingStore.remoteStreams[ids[0]]
        }

        // 最后显示本地视频
        return this.config.webRTCManager.localStream || null
    }

    /**
     * 获取本地流
     */
    getLocalStream = async () => {
        const { webRTCManager } = this.config
        if (webRTCManager && webRTCManager.localStream) return

        try {
            await webRTCManager.getMediaStream({ audio: true, video: true, screen: false })

            if (webRTCManager.localStream) {
                // 同步摄像头状态到 store
                const videoTracks = (webRTCManager.localStream as MediaStream).getVideoTracks()
                this.meetingStore.toggleCamera(videoTracks.length > 0 && videoTracks[0]?.enabled)

                // 绑定本地视频流
                this.bindLocalVideo()
                // 设置音频分析器
                // audioManager.setup(webRTCManager.localStream)
            }
        } catch (error) {
            ErrorHandler.handleWebRTCError(error, '获取本地流')
            throw error
        }
    }

    /**
     * 更新远程视频显示状态
     */
    updateRemoteVideoDisplay(participantId: string) {
        const el = this.remoteVideoRefs[participantId]
        const hasVideo = this.meetingStore.getRemoteVideoState(participantId)
        const stream = this.meetingStore.remoteStreams[participantId]

        if (!el) return

        this.setMediaElementStream(el, hasVideo && stream ? stream : null)
    }

    /**
     * 设置远程视频轨道状态监听器
     *
     * 这个方法的作用是：监听某个远程用户的视频流（MediaStream）中的视频轨道（video track）状态变化，
     * 并根据轨道的添加、移除、结束等事件，动态更新 store 中该用户的视频状态（是否有视频、视频是否可用），
     * 以便前端 UI 能及时反映远程用户的视频状态变化。
     *
     * 主要做了以下几件事：
     * 1. 初始化时根据当前视频轨道设置远程视频状态。
     * 2. 监听流的 addtrack/removetrack 事件，动态感知轨道的增减。
     * 3. 监听每个视频轨道的 ended 事件，感知轨道被关闭。
     * 4. 定时轮询轨道 enabled 状态，防止部分浏览器事件不触发导致状态不同步。
     * 5. 将定时器清理函数存到 window 全局，便于后续清理。
     *
     * @param participantId 参与者ID
     * @param stream 远程流
     */
    setupRemoteVideoTrackListener(participantId: string, stream: MediaStream) {
        // 1. 初始化视频状态
        const videoTracks = stream.getVideoTracks()
        const hasVideo = videoTracks.length > 0 && videoTracks[0]?.enabled
        this.meetingStore.setRemoteVideoState(participantId, hasVideo)

        // 2. 监听轨道添加事件
        stream.addEventListener('addtrack', event => {
            if (event.track && event.track.kind === 'video') {
                this.meetingStore.setRemoteVideoState(participantId, event.track.enabled)
                this.refreshAfterRemoteStateChange(participantId)
            }
        })

        // 3. 监听轨道移除事件
        stream.addEventListener('removetrack', event => {
            if (event.track && event.track.kind === 'video') {
                this.meetingStore.setRemoteVideoState(participantId, false)
                this.refreshAfterRemoteStateChange(participantId)
            }
        })

        // 4. 监听每个视频轨道的 ended 事件
        videoTracks.forEach(track => {
            track.addEventListener('ended', () => {
                this.meetingStore.setRemoteVideoState(participantId, false)
                this.refreshAfterRemoteStateChange(participantId)
            })
        })

        // 5. 定时检查视频轨道 enabled 状态，防止漏判
        const checkRemoteVideoStatus = () => {
            const currentVideoTracks = stream.getVideoTracks()
            const hasEnabledVideo = currentVideoTracks.length > 0 && currentVideoTracks[0]?.enabled

            if (this.meetingStore.getRemoteVideoState(participantId) !== hasEnabledVideo) {
                this.meetingStore.setRemoteVideoState(participantId, hasEnabledVideo)
                this.refreshAfterRemoteStateChange(participantId)
            }
        }

        const statusCheckInterval = setInterval(checkRemoteVideoStatus, 500)

        // 6. 存储清理函数到全局，便于后续清理
        ;(window as any).__videoStatusCleanup = (window as any).__videoStatusCleanup || {}
        ;(window as any).__videoStatusCleanup[participantId] = () => {
            clearInterval(statusCheckInterval)
        }
    }

    /**
     * 清理视频状态监听器
     *
     * 这个方法的作用是：在远程用户离开或不再需要监听时，清理对应的定时器，防止内存泄漏。
     * 会调用 setupRemoteVideoTrackListener 中存储的清理函数，并从全局对象中移除。
     *
     * @param participantId 参与者ID
     */
    cleanupVideoStatusListener(participantId: string) {
        if (
            (window as any).__videoStatusCleanup &&
            (window as any).__videoStatusCleanup[participantId]
        ) {
            ;(window as any).__videoStatusCleanup[participantId]()
            delete (window as any).__videoStatusCleanup[participantId]
        }
    }

    // -----------------------------私有方法-----------------------------

    /**
     * 为媒体元素设置视频流
     * @param el 媒体元素（video/audio）
     * @param stream 媒体流或 null
     */
    private setMediaElementStream(el: HTMLMediaElement, stream: MediaStream | null) {
        try {
            if (!stream || !el) {
                console.error('流或者el不存在', { stream, el })
                return
            }

            el.srcObject = stream
        } catch (error) {
            console.error({ error, el })
        }
    }

    /**
     * 远程状态变更后的统一刷新
     * @param participantId 参与者ID
     */
    private refreshAfterRemoteStateChange(participantId: string) {
        this.updateRemoteVideoDisplay(participantId)
        this.bindMainVideo()
    }
}
