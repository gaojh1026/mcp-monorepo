<template>
    <div>
        <input type="file" @change="onFileChange" />
        <input v-model="customName" placeholder="自定义文件名（可选）" />
        <button @click="handleUpload" :disabled="uploading">上传</button>
        <div v-if="uploading">上传中...</div>
        <div v-if="result">上传结果：{{ result }}</div>
        <div v-if="error" style="color: red">错误：{{ error }}</div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { uploadFileApi } from '@/service/api'

const file = ref(null)
const customName = ref('')
const uploading = ref(false)
const result = ref(null)
const error = ref(null)

function onFileChange(e) {
    file.value = e.target.files[0]
}

async function handleUpload() {
    if (!file.value) {
        error.value = '请先选择文件'
        return
    }
    uploading.value = true
    error.value = null
    result.value = null

    const formData = new FormData()
    formData.append('file', file.value)
    if (customName.value) {
        formData.append('customName', customName.value)
    }

    try {
        const res = await uploadFileApi(formData)
        result.value = res.data
    } catch (err) {
        error.value = err.response?.data?.message || err.message
    } finally {
        uploading.value = false
    }
}
</script>
