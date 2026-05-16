<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { ref, onMounted } from 'vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// 检查路由参数，如果有参数则跳转到sso-center
onMounted(() => {
    const queryParams = route.query
    if (Object.keys(queryParams).length > 0) {
        // 有查询参数，跳转到sso-center
        router.push({ name: 'sso-center', query: queryParams })
    }
})

// 测试数据
const testUserData = ref({
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    avatar: 'https://via.placeholder.com/100'
})

const handleLogout = () => {
    authStore.logout()
    message.success('已退出登录')
    router.push({ name: 'login-page' })
}

// 测试持久化功能
const testPersist = () => {
    // 模拟登录并设置用户数据
    const testToken = 'test_token_' + Date.now()
    // login(accessToken, refreshToken, userData?)
    authStore.login(testToken, '', testUserData.value)
    message.success('已设置测试数据，请刷新页面验证持久化')
}

const clearTestData = () => {
    authStore.logout()
    message.success('已清除测试数据')
}

// 检查持久化状态
const checkPersistStatus = () => {
    const localStorageData = localStorage.getItem('auth')
    if (localStorageData) {
        message.info('持久化数据存在: ' + localStorageData.substring(0, 50) + '...')
    } else {
        message.warning('持久化数据不存在')
    }
}
</script>

<template>
    <div class="home-container">
        <div class="header">
            <h1>欢迎来到首页</h1>
            <div class="header-actions">
                <a-button
                    @click="router.push({ name: 'app-register' })"
                    type="primary"
                    style="margin-right: 8px"
                    >注册应用</a-button
                >
                <a-button @click="checkPersistStatus" style="margin-right: 8px"
                    >检查持久化</a-button
                >
                <a-button @click="testPersist" type="primary" style="margin-right: 8px"
                    >测试持久化</a-button
                >
                <a-button @click="clearTestData" danger style="margin-right: 8px"
                    >清除数据</a-button
                >
                <a-button type="primary" @click="handleLogout">退出登录</a-button>
            </div>
        </div>

        <div class="content">
            <a-card title="用户信息" style="width: 100%; max-width: 600px">
                <template #extra>
                    <a-tag color="green">已登录</a-tag>
                </template>

                <a-descriptions :column="1" bordered>
                    <a-descriptions-item label="Token">
                        {{
                            authStore.accessToken
                                ? `${authStore.accessToken.substring(0, 20)}...`
                                : '无'
                        }}
                    </a-descriptions-item>
                    <a-descriptions-item label="用户信息">
                        {{ authStore.user ? JSON.stringify(authStore.user, null, 2) : '未获取' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="认证状态">
                        <a-tag :color="authStore.isAuthenticated ? 'green' : 'red'">
                            {{ authStore.isAuthenticated ? '已认证' : '未认证' }}
                        </a-tag>
                    </a-descriptions-item>
                </a-descriptions>
            </a-card>

            <a-card title="持久化测试说明" style="width: 100%; max-width: 600px; margin-top: 16px">
                <p>1. 点击"测试持久化"按钮设置测试数据</p>
                <p>2. 刷新页面，验证数据是否保持</p>
                <p>3. 点击"检查持久化"查看 localStorage 中的数据</p>
                <p>4. 点击"清除数据"清除所有数据</p>
            </a-card>
        </div>
    </div>
</template>

<style scoped>
.home-container {
    padding: 24px;
    min-height: 100vh;
    background-color: #f0f2f5;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
    margin: 0;
    color: #1890ff;
}

.header-actions {
    display: flex;
    align-items: center;
}

.content {
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>
