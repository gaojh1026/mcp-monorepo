<template>
    <div class="sso-authorize-container">
        <div class="authorize-card">
            <!-- 头部标题 -->
            <div class="header">
                <h2>授权登录</h2>
                <p class="subtitle">您正在授权第三方应用访问您的账户信息</p>
            </div>

            <a-empty v-if="!appInfo" :description="errorMessage" />
            <main v-else>
                <!-- 用户信息区域 -->
                <div class="user-info-section">
                    <div class="user-avatar">
                        <img src="/default-avatar.png" alt="用户头像" />
                    </div>
                    <div class="user-details">
                        <h3>当前用户</h3>
                        <p class="username">用户名：{{ authStore.user.username || '用户名' }}</p>
                        <p class="email">邮箱：{{ authStore.user.email || 'user@example.com' }}</p>
                    </div>
                </div>

                <!-- 授权应用信息 -->
                <div class="app-info-section">
                    <div class="app-icon">
                        <img src="/app-icon.png" alt="应用图标" />
                    </div>
                    <div class="app-details">
                        <h3>{{ appInfo?.app_name || '第三方应用' }}</h3>
                        <p class="app-description">
                            {{ appInfo?.description || '这是一个需要您授权的第三方应用' }}
                        </p>
                        <p class="redirect-uri">
                            将跳转到: <span>{{ appInfo?.redirect_url }}</span>
                        </p>
                    </div>
                </div>

                <!-- 权限范围 -->
                <div class="permissions-section">
                    <h4>该应用将获得以下权限：</h4>
                    <ul class="permissions-list">
                        <li v-for="permission in permissions" :key="permission">
                            <i class="permission-icon">✓</i>
                            <span>{{ permission }}</span>
                        </li>
                    </ul>
                </div>

                <!-- 操作按钮 -->
                <div class="action-buttons">
                    <a-button class="btn-cancel" @click="handleCancel">取消授权</a-button>
                    <a-button type="primary" class="btn-authorize" @click="handleGenerateCode">
                        确认授权
                    </a-button>
                </div>
            </main>

            <!-- 底部提示 -->
            <div class="footer-tips">
                <p>授权后，该应用将能够访问您的基本信息。您可以随时在设置中撤销授权。</p>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
// 方法常量
import { useAuthStore } from '@/stores/auth'
import { generateCodeApi, verifyApi } from '@/service/api'
import { message as AntdMessage } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
// 用户信息
const authStore = useAuthStore()

// 应用信息
const appInfo = ref<AuthorizeResponse['data'] | null>(null)
// 权限列表
const permissions = ref(['读取您的基本信息（姓名、邮箱）', '访问您的公开资料', '获取您的登录状态'])
const errorMessage = ref('')

/**
 * API: 获取授权页面基本信息
 */
const getAuthorizePage = async () => {
    const { client_id, redirect_url, scope, state } = route.query as any

    const { code, message, data } = await verifyApi({
        client_id,
        redirect_url,
        scope,
        state
    })

    if (code !== 0) {
        errorMessage.value = message || '校验失败'
        AntdMessage.error(errorMessage.value)
        return
    }
    appInfo.value = data
}

const handleCancel = () => {
    console.log('取消授权')
    router.push('/')
}

/**
 * API: 确认授权（内部会生成授权码）
 */
const handleGenerateCode = async () => {
    const { client_id, redirect_url, response_type, scope, state } = route.query as any
    const { code, message, data } = await generateCodeApi({
        client_id,
        redirect_url,
        scope,
        state
    })

    if (code !== 0) {
        errorMessage.value = message || '生成授权码失败'
        AntdMessage.error(errorMessage.value)
        return
    }

    setTimeout(() => {
        window.location.href = data.redirect_url
    }, 1000)
}

onMounted(() => {
    getAuthorizePage()
})
</script>

<style lang="less" scoped>
@import './index.less';
</style>
