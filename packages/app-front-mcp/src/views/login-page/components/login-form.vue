<template>
    <!-- 账号登录表单 -->
    <a-form
        :model="loginFormState"
        name="login"
        :labelCol="{ span: 6 }"
        labelAlign="right"
        @finish="onLoginFinish"
    >
        <a-form-item
            label="邮箱"
            name="email"
            :rules="[{ required: true, message: '请输入邮箱!' }]"
        >
            <a-input v-model:value="loginFormState.email" placeholder="请输入邮箱" />
        </a-form-item>
        <a-form-item
            label="密码"
            name="password"
            :rules="[{ required: true, message: '请输入密码!' }]"
        >
            <a-input-password v-model:value="loginFormState.password" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item
            label="验证码"
            name="captcha"
            :rules="[{ required: true, message: '请输入验证码!' }]"
        >
            <div class="captcha-container">
                <a-input
                    v-model:value="loginFormState.captcha"
                    placeholder="请输入验证码"
                    style="flex: 1; margin-right: 8px"
                />
                <div class="captcha-image-container">
                    <img
                        v-if="captchaData?.captcha_image"
                        :src="`${captchaData?.captcha_image}`"
                        alt="验证码"
                        class="captcha-image"
                        @click="getCaptcha"
                    />
                </div>
            </div>
        </a-form-item>
        <a-form-item>
            <a-button type="primary" html-type="submit" :loading="loading" block> 登录 </a-button>
        </a-form-item>
    </a-form>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message as AntdMessage } from 'ant-design-vue'
import { useAuthStore } from '../../../stores/auth'
// 组件
// 方法常量
import { loginApi } from '@/service/api'
import { useGetCaptcha } from '../useGetCaptcha'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)

// 登录表单状态
const loginFormState = reactive({
    email: '',
    password: '',
    captchaId: '',
    captcha: ''
})

const { captchaData, getCaptcha, captchaLoading } = useGetCaptcha()
getCaptcha()

/**
 * API:登录
 * @param values 表单数据
 */
const onLoginFinish = async (values: any) => {
    loading.value = true
    try {
        const { email, password, captcha } = values
        // 这里调用登录API
        const { code, message, data } = await loginApi({
            email,
            password: password,
            captcha: captcha,
            captchaId: captchaData.value.captcha_id
        })

        if (code !== 0) {
            AntdMessage.error(message || '登录失败')
            // 登录失败时刷新验证码
            await getCaptcha()
            return
        }

        authStore.login(data.access_token, data.refresh_token, data.data)
        AntdMessage.success('登录成功')
        if (route.query.client_id) {
            router.push({ name: 'sso-center', query: route.query })
        } else {
            router.push({ name: 'home' })
        }
    } catch (error) {
        console.log(error)
        AntdMessage.error('登录失败，请稍后重试')
        // 登录失败时刷新验证码
        await getCaptcha()
    } finally {
        loading.value = false
    }
}
</script>

<style scoped lang="less"></style>
