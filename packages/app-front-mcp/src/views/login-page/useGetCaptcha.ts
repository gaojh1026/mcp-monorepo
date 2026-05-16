import { getCaptchaApi } from '@/service/api'
import { ref } from 'vue'
import { message as AntdMessage } from 'ant-design-vue'

/**
 * 获取验证码
 */
export const useGetCaptcha = () => {
    const captchaLoading = ref(false)
    const captchaData = ref({
        captcha_id: '',
        captcha_image: ''
    })

    /**
     * 获取验证码
     */
    const getCaptcha = async () => {
        captchaLoading.value = true

        try {
            const { code, message, data } = await getCaptchaApi()
            if (code !== 0) {
                AntdMessage.error(message || '获取验证码失败')
                return
            }
            captchaData.value = data

            // 1. 编码 SVG 字符串
            const encodedSVG = encodeURIComponent(data.captcha_image)
                .replace(/'/g, '%27')
                .replace(/"/g, '%22')
            // 2. 生成 Data URL
            captchaData.value.captcha_image = `data:image/svg+xml;charset=utf-8,${encodedSVG}`

            // // 清空验证码输入
            // loginFormState.captcha = ''
            // registerFormState.captcha = ''
        } catch (error) {
            console.error('获取验证码失败:', error)
            AntdMessage.error('获取验证码失败，请稍后重试')

            // getCaptcha()
        } finally {
            captchaLoading.value = false
        }
    }

    return {
        captchaData,
        getCaptcha,
        captchaLoading
    }
}
