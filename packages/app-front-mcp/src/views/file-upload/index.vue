<template>
    <div class="file-upload-container">
        <section>
            <h2>单文件上传</h2>
            <FileSingle></FileSingle>
        </section>

        <a-upload :before-upload="handleBeforeUpload" :show-upload-list="false" accept="*">
            <a-button type="primary">选择大文件</a-button>
        </a-upload>
        <div v-if="file">
            <p>文件名：{{ file.name }}</p>
            <p>大小：{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
            <a-progress :percent="uploadPercent" status="active" />
            <a-button
                type="primary"
                :loading="uploading"
                @click="startUpload"
                style="margin-top: 12px"
                >开始上传</a-button
            >
            <a-button @click="reset" style="margin-left: 8px">重置</a-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
// @ts-ignore
import SparkMD5 from 'spark-md5'
import { uploadChunkApi, mergeChunksApi, checkFileApi } from '@/service/api'
import FileSingle from './file-single.vue'

/**
 * 分片大小（单位：字节）
 */
const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB

const file = ref<File | null>(null)
const fileHash = ref('')
const chunkList = ref<Blob[]>([])
const uploading = ref(false)
const uploadPercent = ref(0)
const uploadedChunks = ref<number[]>([])

/**
 * 选择文件前的钩子，阻止自动上传
 * @param selectedFile 选择的文件
 * @returns false 阻止自动上传
 */
function handleBeforeUpload(selectedFile: File) {
    file.value = selectedFile
    resetState()
    return false // 阻止自动上传
}

/**
 * 重置上传状态
 */
function reset() {
    file.value = null
    fileHash.value = ''
    chunkList.value = []
    uploading.value = false
    uploadPercent.value = 0
    uploadedChunks.value = []
}

/**
 * 重置部分状态
 */
function resetState() {
    fileHash.value = ''
    chunkList.value = []
    uploading.value = false
    uploadPercent.value = 0
    uploadedChunks.value = []
}

/**
 * 计算文件hash（使用SparkMD5）
 * @param file 目标文件
 * @returns Promise<string> 文件hash
 */
function calculateFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunkSize = CHUNK_SIZE
        const chunks = Math.ceil(file.size / chunkSize)
        let currentChunk = 0
        const spark = new SparkMD5.ArrayBuffer()
        const fileReader = new FileReader()

        fileReader.onload = e => {
            if (e.target && e.target.result) {
                spark.append(e.target.result as ArrayBuffer)
                currentChunk++
                if (currentChunk < chunks) {
                    loadNext()
                } else {
                    resolve(spark.end())
                }
            }
        }
        fileReader.onerror = reject

        function loadNext() {
            const start = currentChunk * chunkSize
            const end = Math.min(file.size, start + chunkSize)
            fileReader.readAsArrayBuffer(file.slice(start, end))
        }
        loadNext()
    })
}

/**
 * 切分文件为分片
 * @param file 目标文件
 * @returns Blob[] 分片数组
 */
function createChunks(file: File): Blob[] {
    const chunks: Blob[] = []
    let cur = 0
    while (cur < file.size) {
        chunks.push(file.slice(cur, cur + CHUNK_SIZE))
        cur += CHUNK_SIZE
    }
    return chunks
}

/**
 * 开始上传流程
 */
async function startUpload() {
    if (!file.value) return
    uploading.value = true
    try {
        // 1. 计算文件hash
        fileHash.value = await calculateFileHash(file.value)
        console.log('fileHash.value', fileHash.value)
        // 2. 切分分片
        chunkList.value = createChunks(file.value)
        console.log('chunkList.value', chunkList.value)
        // 3. 检查已上传分片（断点续传/秒传）
        const checkRes = await checkFileApi({
            fileHash: fileHash.value,
            filename: file.value.name
        })
        console.log('checkRes', checkRes)

        if (checkRes.data.uploaded) {
            uploadPercent.value = 100
            message.success('该文件已上传，无需重复上传')
            uploading.value = false
            return
        }
        uploadedChunks.value = checkRes.data.uploadedChunks || []

        console.log('uploadedChunks.value', uploadedChunks.value)

        // 4. 依次上传分片
        for (let i = 0; i < chunkList.value.length; i++) {
            if (uploadedChunks.value.includes(i)) {
                // 跳过已上传分片
                uploadPercent.value = Math.round(((i + 1) / chunkList.value.length) * 100)
                continue
            }
            console.log('上传分片', i)
            const formData = new FormData()
            formData.append('file', chunkList.value[i])
            formData.append('fileHash', fileHash.value)
            formData.append('chunkIndex', i.toString())
            formData.append('totalChunks', chunkList.value.length.toString())
            formData.append('filename', file.value.name)
            await uploadChunkApi(formData)
            uploadPercent.value = Math.round(((i + 1) / chunkList.value.length) * 100)
        }
        // 5. 合并分片
        setTimeout(async () => {
            await mergeChunksApi({
                fileHash: fileHash.value,
                filename: file.value.name,
                totalChunks: chunkList.value.length
            })
            message.success('上传并合并成功！')
        }, 0)
    } catch (err: any) {
        message.error('上传失败：' + (err?.message || '未知错误'))
    } finally {
        uploading.value = false
    }
}
</script>

<style scoped>
.file-upload-container {
    max-width: 500px;
    margin: 40px auto;
    padding: 32px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}
</style>
