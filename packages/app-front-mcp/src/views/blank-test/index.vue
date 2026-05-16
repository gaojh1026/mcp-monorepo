<template>
    <div class="blank-test-page">
        <div class="blank-test-container">
            <h1>空白测试页面</h1>
            <p class="desc">这是一个用于快速测试和演示功能的空白页面</p>

            <div class="button-container">
                <button class="test-button" @click="handleButtonClick">点击测试</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'

/**
 * 处理按钮点击事件
 */
const handleButtonClick = () => {
    message.success('按钮点击成功！')
}
</script>

<style scoped lang="less">
.blank-test-page {
    min-height: 100vh;
    padding: 40px 20px;
    background-color: #f5f5f5;
}

.blank-test-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;

    h1 {
        margin-bottom: 16px;
        font-size: 32px;
        color: #333;
    }

    .desc {
        margin-bottom: 40px;
        font-size: 16px;
        color: #666;
    }

    .button-container {
        margin-top: 40px;
    }

    .test-button {
        padding: 12px 32px;
        font-size: 16px;
        color: #fff;
        background-color: #1890ff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;

        &:hover {
            background-color: #40a9ff;
        }

        &:active {
            background-color: #096dd9;
        }
    }
}
</style>
