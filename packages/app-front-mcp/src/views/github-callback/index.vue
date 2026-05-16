<template>
    <div class="github-callback-container">
        <div class="callback-card">
            <div class="loading-content" v-if="loading">
                <a-spin size="large" />
                <p>正在处理GitHub登录...</p>
            </div>

            <div v-else-if="userInfo">
                <div>
                    {{ userInfo }}
                </div>
            </div>

            <div class="error-content" v-else-if="error">
                <a-result status="error" title="登录失败" :sub-title="errorMessage">
                    <template #extra>
                        <a-button type="primary" @click="goToLogin">返回登录页</a-button>
                    </template>
                </a-result>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message as AntdMessage } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { getGithubTokenApi, getGithubUserInfoApi, githubLoginApi } from '@/service/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref(false)
const errorMessage = ref('')

/**
 * 处理GitHub回调
 */
const handleGitHubCallback = async () => {
    try {
        const { code, state } = route.query

        // 验证state参数
        const savedState = localStorage.getItem('github_oauth_state')
        if (!state || state !== savedState) {
            throw new Error('无效的state参数')
        }

        // 清除存储的state
        localStorage.removeItem('github_oauth_state')

        if (!code) {
            throw new Error('未获取到授权码')
        }

        // 调用后端API处理GitHub登录
        const { code: apiCode, message, data } = await getGithubTokenApi({ code: code as string })

        if (apiCode !== 0) {
            throw new Error(message || 'GitHub登录失败')
        }

        // 登录成功
        authStore.login(data.access_token, data.refresh_token || '', data.user || data.data)
        AntdMessage.success('GitHub登录成功')
        userInfo.value = data.user || data.data || {}

        // 跳转到目标页面
        if (route.query.client_id) {
            // router.push({ name: 'sso-center', query: route.query })
        } else {
            // router.push({ name: 'home' })
        }
    } catch (err: any) {
        console.error('GitHub登录失败:', err)
        error.value = true
        errorMessage.value = err.message || 'GitHub登录失败，请重试'
    } finally {
        loading.value = false
    }
}

const userInfo = ref({})
const getGithubUserInfo = async () => {
    const {
        code: apiCode,
        message,
        data
    } = await getGithubUserInfoApi({ code: (authStore.accessToken || '') as string })

    if (apiCode !== 0) {
        throw new Error(message || '获取GitHub用户信息失败')
    }

    userInfo.value = data
}

/**
 * 返回登录页
 */
const goToLogin = () => {
    router.push({ name: 'login-page' })
}

onMounted(() => {
    handleGitHubCallback()
})
</script>

<style scoped lang="less">
.github-callback-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f0f2f5;

    .callback-card {
        width: 100%;
        max-width: 400px;
        padding: 40px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .loading-content {
        text-align: center;

        p {
            margin-top: 16px;
            color: #666;
            font-size: 14px;
        }
    }

    .error-content {
        text-align: center;
    }
}
</style>
