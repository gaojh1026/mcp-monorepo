import { QRCodeStatus } from '@/config/qrcode-status'

export interface QRCodeStatusConfig {
    title: string
    description: string
    className: string
    overlayClass: string
    showOverlay: boolean
    showScanAnimation: boolean
    icon: string | null
    borderColor: string
    shadowColor: string
}

// 二维码状态配置
export const QR_CODE_STATUS_CONFIG: Record<QRCodeStatus, QRCodeStatusConfig> = {
    [QRCodeStatus.NOSCAN]: {
        title: '请使用手机扫码登录',
        description: '打开手机应用，扫描二维码即可快速登录',
        className: 'waiting',
        overlayClass: '',
        showOverlay: true,
        showScanAnimation: true,
        icon: null,
        borderColor: '#e8f4fd',
        shadowColor: 'rgba(24, 144, 255, 0.15)'
    },
    [QRCodeStatus.SCAN_WAIT_CONFIRM]: {
        title: '正在扫描中...',
        description: '请稍候，正在验证登录信息',
        className: 'scanning',
        overlayClass: '',
        showOverlay: true,
        showScanAnimation: true,
        icon: null,
        borderColor: '#1890ff',
        shadowColor: 'rgba(24, 144, 255, 0.2)'
    },
    [QRCodeStatus.SCAN_CONFIRM]: {
        title: '扫码成功，正在登录...',
        description: '登录成功，正在跳转...',
        className: 'success',
        overlayClass: 'success',
        showOverlay: true,
        showScanAnimation: false,
        icon: 'qr-status-success',
        borderColor: '#52c41a',
        shadowColor: 'rgba(82, 196, 26, 0.15)'
    },
    [QRCodeStatus.EXPIRED]: {
        title: '二维码已过期，请刷新',
        description: '二维码已失效，请点击刷新重新获取',
        className: 'expired',
        overlayClass: 'expired',
        showOverlay: true,
        showScanAnimation: false,
        icon: 'qr-status-expired',
        borderColor: '#ff4d4f',
        shadowColor: 'rgba(255, 77, 79, 0.15)'
    },
    [QRCodeStatus.SCAN_CANCEL]: {
        title: '扫码已取消',
        description: '扫码已取消，请刷新二维码',
        className: 'expired',
        overlayClass: 'expired',
        showOverlay: true,
        showScanAnimation: false,
        icon: 'qr-status-expired',
        borderColor: '#ff4d4f',
        shadowColor: 'rgba(255, 77, 79, 0.15)'
    }
} as const
