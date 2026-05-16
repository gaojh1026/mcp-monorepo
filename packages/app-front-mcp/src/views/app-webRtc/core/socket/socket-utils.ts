import { message } from 'ant-design-vue'

/**
 * 处理录制事件
 */
export const handleRecordEvent = (status: string, blob?: Blob | null) => {
    if (status === 'stopped' && blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `record-${Date.now()}.webm`
        a.click()
        URL.revokeObjectURL(url)
        message.success('录制文件已下载')
    } else if (status === 'started') {
        message.info('开始录制')
    } else if (status === 'paused') {
        message.info('录制已暂停')
    } else if (status === 'resumed') {
        message.info('录制已恢复')
    }
}
