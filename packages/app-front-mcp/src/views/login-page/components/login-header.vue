<template>
    <div class="login-header">
        <h2>{{ title }}</h2>

        <!-- 登录方式切换 -->
        <div class="login-tabs">
            <div
                v-for="item in tabList"
                :key="item.value"
                class="tab-item"
                :class="{ active: currentModeModal === item.value }"
                @click="switchMode(item.value)"
            >
                <SvgIcon :name="item.icon" size="20px" />
                {{ item.label }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
    emit('update:currentMode', mode)
}

const tabList = [
    {
        label: '账号登录',
        value: LoginMode.Login,
        icon: 'login',
        title: '用户登录'
    },
    {
        label: '扫码登录',
        value: LoginMode.Qrcode,
        icon: 'qrcode',
        title: '扫码登录'
    },
    {
        label: '用户注册',
        value: LoginMode.Register,
        icon: 'register',
        title: '用户注册'
    }
]

const title = computed(() => {
    return tabList.find(item => item.value === currentModeModal.value)?.title
})
</script>

<style scoped lang="less">
.login-header {
    h2 {
        text-align: center;
        margin-bottom: 24px;
        color: #1890ff;
    }
    .login-tabs {
        display: flex;
        justify-content: center;
        margin-bottom: 32px;
        background: #fafafa;
        border-radius: 8px;
        padding: 4px;
        gap: 4px;

        .tab-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            cursor: pointer;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            color: #666;
            transition: all 0.3s ease;
            white-space: nowrap;

            svg {
                transition: transform 0.3s ease;
            }

            &.active {
                background: white;
                color: #1890ff;
                box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);

                svg {
                    transform: scale(1.1);
                }
            }

            &:hover:not(.active) {
                color: #1890ff;
                background: rgba(24, 144, 255, 0.05);
            }
        }
    }
}
</style>
