<template>
    <!-- 注册表单 -->
    <a-form
        :model="registerFormState"
        name="register"
        :labelCol="{ span: 6 }"
        labelAlign="right"
        @finish="onRegisterFinish"
    >
        <a-form-item
            label="用户名"
            name="username"
            :rules="[{ required: true, message: '请输入用户名!' }]"
        >
            <a-input v-model:value="registerFormState.username" placeholder="请输入用户名" />
        </a-form-item>
        <a-form-item
            label="邮箱"
            name="email"
            :rules="[
                { required: true, message: '请输入邮箱!' },
                { type: 'email', message: '请输入有效的邮箱地址!' }
            ]"
        >
            <a-input v-model:value="registerFormState.email" placeholder="请输入邮箱" />
        </a-form-item>
        <a-form-item
            label="密码"
            name="password"
            :rules="[
                { required: true, message: '请输入密码!' },
                { min: 6, message: '密码长度至少6位!' }
            ]"
        >
            <a-input-password v-model:value="registerFormState.password" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item
            label="确认密码"
            name="confirmPassword"
            :rules="[
                { required: true, message: '请确认密码!' },
                { validator: validateConfirmPassword, trigger: 'blur' }
            ]"
        >
            <a-input-password
                v-model:value="registerFormState.confirmPassword"
                placeholder="请确认密码"
            />
        </a-form-item>
        <a-form-item
            label="验证码"
            name="captcha"
            :rules="[{ required: true, message: '请输入验证码!' }]"
        >
            <div class="captcha-container">
                <a-input
                    v-model:value="registerFormState.captcha"
                    placeholder="请输入验证码"
                    style="flex: 1; margin-right: 8px"
                />
                <div v-loading="captchaLoading" class="captcha-image-container">
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
            <a-button type="primary" html-type="submit" :loading="loading" block> 注册 </a-button>
        </a-form-item>
    </a-form>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message as AntdMessage } from 'ant-design-vue'
import { useAuthStore } from '../../../stores/auth'
// 方法常量
import { useGetCaptcha } from '../useGetCaptcha'
import { registerApi } from '@/service/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)

// 注册表单状态
const registerFormState = reactive({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    captchaId: '',
    captcha: ''
})

const { captchaData, getCaptcha, captchaLoading } = useGetCaptcha()

/**
 * 验证确认密码
 */
const validateConfirmPassword = (_: any, value: string) => {
    if (!value) {
        return Promise.reject(new Error('请确认密码!'))
    }
    if (value !== registerFormState.password) {
        return Promise.reject(new Error('两次输入的密码不一致!'))
    }
    return Promise.resolve()
}

/**
 * API:注册
 * @param values 表单数据
 */
const onRegisterFinish = async (values: any) => {
    loading.value = true
    try {
        const { username, email, password, captcha } = values
        // 这里调用注册API
        const { code, message, data } = await registerApi({
            username,
            email,
            password: password,
            captcha: captcha,
            captchaId: captchaData.value.captcha_id
        })

        if (code !== 0) {
            AntdMessage.error(message || '注册失败')
            // 注册失败时刷新验证码
            await getCaptcha()
            return
        }
        console.log(data)

        authStore.login(data.access_token, data.refresh_token, data.data)
        AntdMessage.success('注册成功')
        if (route.query.client_id) {
            router.push({ name: 'sso-center', query: route.query })
        } else {
            router.push({ name: 'login-page' })
        }
    } catch (error) {
        console.log(error)
        AntdMessage.error('注册失败，请稍后重试')
        // 注册失败时刷新验证码
        await getCaptcha()
    } finally {
        loading.value = false
    }
}

// 页面加载时获取验证码
onMounted(() => {
    getCaptcha()
})
</script>

<style scoped lang="less"></style>
