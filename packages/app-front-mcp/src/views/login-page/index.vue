<template>
    <!-- 登录页 -->
    <div class="login-container">
        <div class="login-form">
            <!-- 登录方式切换 -->
            <LoginHeader v-model:currentMode="currentMode" />
            <!-- tab1:账号登录表单 -->
            <LoginForm v-if="currentMode === LoginMode.Login" />
            <!-- tab2:扫码登录界面 -->
            <LoginQrcode v-if="currentMode === LoginMode.Qrcode" />
            <!-- tab3:注册表单 -->
            <LoginRegister v-if="currentMode === LoginMode.Register" />
            <!-- 注册/第三方登录 -->
            <LoginFooter v-model:currentMode="currentMode" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// 组件
import LoginHeader from './components/login-header.vue'
import LoginForm from './components/login-form.vue'
import LoginQrcode from './components/login-qrcode.vue'
import LoginRegister from './components/login-register.vue'
import LoginFooter from './components/login-footer.vue'
// 方法常量
import { LoginMode } from './enums'

const currentMode = ref<LoginMode>(LoginMode.Login)
</script>

<style lang="less">
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f0f2f5;

    .login-form {
        width: 100%;
        max-width: 400px;
        padding: 40px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        h1 {
            text-align: center;
            margin-bottom: 24px;
            color: #1890ff;
        }
    }

    .captcha-container {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .captcha-image-container {
        display: flex;
        align-items: center;
    }

    .captcha-image {
        height: 32px;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        cursor: pointer;
        transition: border-color 0.3s;

        &:hover {
            border-color: #1890ff;
        }
    }
}
</style>
