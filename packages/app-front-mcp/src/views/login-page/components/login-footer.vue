<template>
    <div class="login-footer">
        <!-- 分割线 -->
        <div class="divider">
            <span>或</span>
        </div>

        <!-- GitHub登录按钮 -->
        <a-button
            type="default"
            block
            class="github-btn"
            @click="handleGitHubLogin"
            :loading="githubLoading"
        >
            <template #icon>
                <SvgIcon name="github" size="20px" />
            </template>
            使用 GitHub 登录
        </a-button>

        <!-- 底部提示 -->
        <div class="bottom-tips">
            <p v-if="currentModeModal === 'login'">
                还没有账号？
                <a @click="switchMode(LoginMode.Register)">立即注册</a>
            </p>
            <p v-else-if="currentModeModal === 'register'">
                已有账号？
                <a @click="switchMode(LoginMode.Login)">立即登录</a>
            </p>
            <p v-else-if="currentModeModal === 'qrcode'">
                其他登录方式？
                <a @click="switchMode(LoginMode.Login)">账号登录</a>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
// 组件
import { LoginMode } from '../enums'

interface Props {
    currentMode: LoginMode
}

const props = defineProps<Props>()
const emit = defineEmits(['update:currentMode'])

const currentModeModal = computed({
    get() {
        return props.currentMode
    },
    set(value: LoginMode) {
        emit('update:currentMode', value)
    }
})

const switchMode = (mode: LoginMode) => {
    currentModeModal.value = mode
}

/**
 * hook: 使用 GitHub 登录
 */
const useGitHubLogin = () => {
    const githubLoading = ref(false)

    /**
     * GitHub登录
     */
    const handleGitHubLogin = () => {
        githubLoading.value = true

        // GitHub OAuth 授权URL（需要根据实际配置修改）
        const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
        const redirectUri = encodeURIComponent(window.location.origin + '/github-callback')
        const scope = 'read:user user:email'
        const state = Math.random().toString(36).substring(7)

        // 存储state用于验证回调
        localStorage.setItem('github_oauth_state', state)

        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`

        window.location.href = githubAuthUrl
    }

    return {
        githubLoading,
        handleGitHubLogin
    }
}

const { githubLoading, handleGitHubLogin } = useGitHubLogin()
</script>

<style scoped lang="less">
.login-footer {
    .divider {
        position: relative;
        text-align: center;
        margin: 24px 0;

        &::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background-color: #d9d9d9;
        }

        span {
            background-color: white;
            padding: 0 16px;
            color: #999;
            font-size: 14px;
        }
    }

    .github-btn {
        height: 40px;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s;

        &:hover {
            border-color: #1890ff;
            color: #1890ff;
        }
    }

    .bottom-tips {
        text-align: center;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #f0f0f0;

        p {
            margin: 0;
            color: #666;
            font-size: 14px;

            a {
                color: #1890ff;
                cursor: pointer;
                text-decoration: none;

                &:hover {
                    text-decoration: underline;
                }
            }
        }
    }
}
</style>
