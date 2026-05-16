<template>
    <!-- 扫码登录界面 -->
    <div class="login-qrcode">
        <div class="qrcode-wrapper">
            <div class="qrcode-placeholder" :class="currentStatusConfig.className">
                <!-- 二维码 -->
                <div
                    v-if="currentStatusConfig.showOverlay"
                    class="qrcode-overlay"
                    :class="currentStatusConfig.overlayClass"
                >
                    <!-- 扫描动画 -->
                    <div class="scan-animation" v-if="currentStatusConfig.showScanAnimation">
                        <div class="scan-line"></div>
                    </div>
                    <!-- 状态图标 -->
                    <SvgIcon
                        v-if="currentStatusConfig.icon"
                        :name="currentStatusConfig.icon"
                        size="48"
                    />
                </div>
                <!-- 二维码图案 -->
                <img class="qrcode-image" :src="qrcodeData.qrcodeUrl" alt="二维码" />
            </div>
            <!-- 二维码提示 -->
            <div class="qrcode-tips">
                <p class="tip-title">{{ currentStatusConfig.title }}</p>
                <p class="tip-desc">{{ currentStatusConfig.description }}</p>
                <div class="qrcode-actions">
                    <a-button type="link" :loading="qrcodeLoading" @click="refreshQRCode">
                        <SvgIcon name="refresh" size="14" />
                        刷新二维码
                    </a-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message as AntdMessage } from 'ant-design-vue'
import { useAuthStore } from '../../../stores/auth'
// 方法常量
import { getCaptchaApi, loginApi, registerApi, githubLoginApi } from '@/service/api'
import { LoginMode } from '../enums'
import { useQRCode } from './useQRCode'
import { QRCodeStatus } from '@/config/qrcode-status'

// 使用二维码组合式函数
const { currentStatusConfig, qrcodeData, qrcodeLoading, getQrcode, refreshQRCode, cleanup } =
    useQRCode()

// 组件挂载时获取二维码
onMounted(() => {
    getQrcode()
})

// 组件卸载时清理资源
onUnmounted(() => {
    cleanup()
})
</script>

<style lang="less">
.qrcode-image {
    // position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
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

.qrcode-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 32px 24px;
    // background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.qrcode-placeholder {
    position: relative;
    width: 200px;
    height: 200px;
    background: white;
    border: 2px solid #e8f4fd;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(24, 144, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    overflow: hidden;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(24, 144, 255, 0.2);
    }

    &.success {
        border-color: #52c41a;
        box-shadow: 0 8px 32px rgba(82, 196, 26, 0.15);

        &:hover {
            box-shadow: 0 12px 40px rgba(82, 196, 26, 0.2);
        }
    }

    &.expired {
        border-color: #ff4d4f;
        box-shadow: 0 8px 32px rgba(255, 77, 79, 0.15);

        &:hover {
            box-shadow: 0 12px 40px rgba(255, 77, 79, 0.2);
        }

        .qrcode-pattern {
            opacity: 0.5;
            filter: grayscale(1);
        }
    }

    &.scanning {
        border-color: #1890ff;
        box-shadow: 0 8px 32px rgba(24, 144, 255, 0.2);

        &:hover {
            box-shadow: 0 12px 40px rgba(24, 144, 255, 0.25);
        }
    }

    svg {
        border-radius: 8px;
    }

    .qrcode-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        backdrop-filter: blur(4px);
        transition: opacity 0.3s ease;

        &.success {
            background: rgba(82, 196, 26, 0.1);
            backdrop-filter: blur(8px);

            svg {
                animation: successPulse 1s ease-in-out;
            }
        }

        &.expired {
            background: rgba(255, 77, 79, 0.1);
            backdrop-filter: blur(8px);

            svg {
                animation: shake 0.5s ease-in-out;
            }
        }

        .scan-animation {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: 12px;

            .scan-line {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 2px;
                background: linear-gradient(90deg, transparent, #1890ff, transparent);
                animation: scan 2s linear infinite;
                box-shadow: 0 0 8px rgba(24, 144, 255, 0.6);
            }
        }

        svg {
            animation: pulse 2s infinite;
            z-index: 1;
        }
    }
}

.qrcode-tips {
    text-align: center;
    max-width: 280px;

    .tip-title {
        margin: 0 0 8px 0;
        color: #262626;
        font-size: 16px;
        font-weight: 500;
    }

    .tip-desc {
        margin: 0 0 20px 0;
        color: #8c8c8c;
        font-size: 14px;
        line-height: 1.5;
    }

    .qrcode-actions {
        .ant-btn-link {
            color: #1890ff;
            font-size: 14px;
            padding: 8px 16px;
            border-radius: 6px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            margin: 0 auto;

            &:hover {
                background-color: rgba(24, 144, 255, 0.1);
                color: #40a9ff;
            }

            svg {
                margin-right: 4px;
            }
        }
    }
}

@keyframes scan {
    0% {
        transform: translateY(0);
        opacity: 0;
    }
    10% {
        opacity: 1;
    }
    90% {
        opacity: 1;
    }
    100% {
        transform: translateY(200px);
        opacity: 0;
    }
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.05);
        opacity: 0.8;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes successPulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.1);
        opacity: 0.8;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes shake {
    0% {
        transform: rotate(0deg);
    }
    25% {
        transform: rotate(15deg);
    }
    50% {
        transform: rotate(0deg);
    }
    75% {
        transform: rotate(-15deg);
    }
    100% {
        transform: rotate(0deg);
    }
}
</style>
