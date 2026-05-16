<template>
    <div class="h5-login">
        <a-button @click="updateQrcodeStatus(QRCodeStatus.SCAN_CANCEL)">取消扫码</a-button>
        <a-button @click="handleConfirmLogin">确认登录</a-button>
        <a-button @click="updateQrcodeStatus(QRCodeStatus.SCAN_CONFIRM)">扫码成功</a-button>
    </div>
</template>

<script setup lang="ts">
import { updateQrcodeStatusApi } from '@/service/api'
import { onMounted, ref } from 'vue'
import { QRCodeStatus } from '@/config/qrcode-status'
import { useRoute } from 'vue-router'

const route = useRoute()

const qrcodeId = ref(route.query.qrcodeId)

const updateQrcodeStatus = async (status: QRCodeStatus) => {
    const { code, message } = await updateQrcodeStatusApi({
        qrcodeId: qrcodeId.value as string,
        status: status
    })
}

const handleConfirmLogin = async () => {
    const { code, message } = await updateQrcodeStatusApi({
        qrcodeId: qrcodeId.value as string,
        status: QRCodeStatus.SCAN_CONFIRM
    })
}

onMounted(() => {
    updateQrcodeStatus(QRCodeStatus.SCAN_WAIT_CONFIRM)
})
</script>

<style scoped lang="less">
.h5-login {
}
</style>
