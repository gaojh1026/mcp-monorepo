<template>
    <div class="html-diff-demo">
        <h2>HTML Diff 对比工具</h2>

        <div class="container">
            <div class="input-section">
                <div class="input-group">
                    <label>原始HTML:</label>
                    <textarea
                        v-model="originalHtml"
                        placeholder="请输入原始HTML内容"
                        rows="10"
                    ></textarea>
                </div>

                <div class="input-group">
                    <label>修改后的HTML:</label>
                    <textarea
                        v-model="modifiedHtml"
                        placeholder="请输入修改后的HTML内容"
                        rows="10"
                    ></textarea>
                </div>
            </div>

            <div class="actions">
                <button @click="performDiff" class="diff-btn">对比差异</button>
                <button @click="loadSample" class="sample-btn">加载示例</button>
                <button @click="clearAll" class="clear-btn">清空</button>
            </div>

            <div v-if="diffResult" class="result-section">
                <h3>差异结果:</h3>
                <div class="diff-result" v-html="diffResult"></div>
            </div>
        </div>
    </div>

    <div id="oldHtml">
        <p>Some old html here</p>
    </div>

    <div id="newHtml">
        <p>Some new html goes here</p>
    </div>

    <div id="diffHtml"></div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
// @ts-ignore - htmldiff-js 没有TypeScript类型定义
import HtmlDiff from 'htmldiff-js'

const originalHtml = ref('')
const modifiedHtml = ref('')
const diffResult = ref('')

const performDiff = () => {
    console.log('originalHtml', HtmlDiff.default)
    if (!originalHtml.value.trim() || !modifiedHtml.value.trim()) {
        alert('请输入要对比的HTML内容')
        return
    }

    try {
        // htmldiff-js 的正确用法：直接调用 default 方法
        diffResult.value = HtmlDiff.default(originalHtml.value, modifiedHtml.value)
    } catch (error) {
        console.error('HTML对比出错:', error)
        alert(`HTML对比出错: ${error instanceof Error ? error.message : '未知错误'}`)
    }
}

const loadSample = () => {
    originalHtml.value = `
<div>
  <h1>Hello World</h1>
  <p>这是一个原始的段落。</p>
  <ul>
    <li>项目1</li>
    <li>项目2</li>
  </ul>
</div>
  `.trim()

    modifiedHtml.value = `
<div>
  <h1>Hello Vue</h1>
  <p>这是一个修改后的段落，包含了一些<strong>新的内容</strong>。</p>
  <ul>
    <li>项目1</li>
    <li>修改的项目2</li>
    <li>新增的项目3</li>
  </ul>
  <p>全新的段落</p>
</div>
  `.trim()
}

const clearAll = () => {
    originalHtml.value = ''
    modifiedHtml.value = ''
    diffResult.value = ''
}

onMounted(() => {
    const oldHtml = document.getElementById('oldHtml')
    const newHtml = document.getElementById('newHtml')
    const diffHtml = document.getElementById('diffHtml')

    const diffResult = HtmlDiff.execute(oldHtml.innerHTML, newHtml.innerHTML)
    diffHtml.innerHTML = diffResult
    console.log('diffResult', diffResult)
})
</script>

<style scoped>
.html-diff-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}

h2 {
    text-align: center;
    color: #333;
    margin-bottom: 30px;
}

.container {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.input-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.input-group label {
    font-weight: bold;
    color: #555;
}

.input-group textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    resize: vertical;
}

.input-group textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.actions {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin: 20px 0;
}

.actions button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.3s ease;
}

.diff-btn {
    background-color: #007bff;
    color: white;
}

.diff-btn:hover {
    background-color: #0056b3;
}

.sample-btn {
    background-color: #28a745;
    color: white;
}

.sample-btn:hover {
    background-color: #1e7e34;
}

.clear-btn {
    background-color: #6c757d;
    color: white;
}

.clear-btn:hover {
    background-color: #545b62;
}

.result-section {
    margin-top: 30px;
}

.result-section h3 {
    color: #333;
    margin-bottom: 15px;
}

.diff-result {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 20px;
    background-color: #f8f9fa;
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
    word-wrap: break-word;
}

/* HTMLDiff 样式 */
.diff-result :deep(.diff) {
    color: #000;
}

.diff-result :deep(.ins) {
    background-color: #e6ffed;
    color: #22863a;
    text-decoration: none;
}

.diff-result :deep(.del) {
    background-color: #ffeef0;
    color: #cb2431;
    text-decoration: line-through;
}

.diff-result :deep(.tag) {
    color: #6f42c1;
}

@media (max-width: 768px) {
    .input-section {
        grid-template-columns: 1fr;
    }

    .actions {
        flex-direction: column;
        align-items: center;
    }

    .actions button {
        width: 200px;
    }
}
</style>

<style>
.diffmod {
    /* color: red; */
    font-weight: 500;
}

del.diffmod {
    color: red;
}

ins.diffmod {
    color: green;
    text-decoration: none;
}

.diffins {
    color: green;
}
</style>
