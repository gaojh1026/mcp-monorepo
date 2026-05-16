import { ref, computed } from 'vue'
import { message as AntdMessage } from 'ant-design-vue'
import { QR_CODE_STATUS_CONFIG } from './qrcode-config'
import { getQrcodeApi, getQrcodeStatusApi } from '@/service/api'
import { QRCodeStatus } from '@/config/qrcode-status'

export function useQRCode() {
    // 二维码加载状态
    const qrcodeLoading = ref(false)
    // 二维码状态
    const qrCodeStatus = ref<QRCodeStatus>(QRCodeStatus.NOSCAN)
    // 二维码数据
    const qrcodeData = ref<GetQrcodeResponse['data']>({
        qrcodeId: '',
        qrcodeUrl: ''
    })
    // 二维码状态轮询定时器
    const qrCodeTimer = ref<number | null>(null)
    // 计算当前状态配置
    const currentStatusConfig = computed(
        () =>
            QR_CODE_STATUS_CONFIG[qrCodeStatus.value] ||
            QR_CODE_STATUS_CONFIG[QRCodeStatus.SCAN_WAIT_CONFIRM]
    )

    /**
     * API: 获取二维码
     */
    const getQrcode = async () => {
        try {
            qrcodeLoading.value = true

            const { code, message, data } = await getQrcodeApi()
            if (code !== 0) {
                AntdMessage.error(message || '获取二维码失败')
                return
            }
            qrcodeData.value = data

            // 重置状态为等待扫描
            setQRCodeStatus(QRCodeStatus.NOSCAN)

            // 轮询获取二维码状态
            getQrcodeStatus()
        } catch (error) {
            console.error('获取二维码失败:', error)
            AntdMessage.error('获取二维码失败')
        } finally {
            qrcodeLoading.value = false
        }
    }

    /**
     * API:轮询获取二维码状态
     */
    const getQrcodeStatus = async () => {
        // 轮询获取二维码状态
        const pollStatus = async () => {
            try {
                const { code, message, data } = await getQrcodeStatusApi({
                    qrcodeId: qrcodeData.value.qrcodeId
                })

                if (code !== 0) {
                    cleanup()
                    setQRCodeStatus(QRCodeStatus.EXPIRED)
                    AntdMessage.error(message || '获取二维码状态失败')
                    return
                }

                const status = data.status
                setQRCodeStatus(status)

                // 如果状态是成功或过期，停止轮询
                if (
                    [QRCodeStatus.EXPIRED, QRCodeStatus.SCAN_CONFIRM].includes(
                        status as QRCodeStatus
                    )
                ) {
                    cleanup()
                    return
                }

                // 继续轮询，每1秒检查一次
                qrCodeTimer.value = setTimeout(pollStatus, 1000)
            } catch (error) {
                console.error('轮询二维码状态失败:', error)
                AntdMessage.error('获取二维码状态失败')
                cleanup()
            }
        }

        // 开始轮询
        pollStatus()
    }

    /**
     * 设置二维码状态
     */
    const setQRCodeStatus = (status: QRCodeStatus) => {
        qrCodeStatus.value = status
    }

    /**
     * 刷新二维码
     */
    const refreshQRCode = async () => {
        cleanup()

        // 重新获取二维码
        await getQrcode()
        AntdMessage.info('二维码已刷新')
    }

    /**
     * 二维码过期
     */
    const expireQRCode = () => {
        setQRCodeStatus(QRCodeStatus.EXPIRED)
        cleanup()
    }

    /**
     * 清理资源
     */
    const cleanup = () => {
        if (qrCodeTimer.value) {
            clearTimeout(qrCodeTimer.value)
            qrCodeTimer.value = null
        }
    }

    return {
        // 状态相关
        qrCodeStatus,
        currentStatusConfig,

        // 数据相关
        qrcodeData,
        qrcodeLoading,

        // 方法
        getQrcode,
        setQRCodeStatus,
        refreshQRCode,
        expireQRCode,
        cleanup
    }
}
