/**
 * 二维码状态
 */
export const enum QRCodeStatus {
    NOSCAN = 'noscan', // 未扫码
    SCAN_WAIT_CONFIRM = 'scan-wait-confirm', // 已扫码，等待确认
    SCAN_CONFIRM = 'scan-confirm', // 已确认
    SCAN_CANCEL = 'scan-cancel', // 已取消
    EXPIRED = 'expired' // 已过期
}
