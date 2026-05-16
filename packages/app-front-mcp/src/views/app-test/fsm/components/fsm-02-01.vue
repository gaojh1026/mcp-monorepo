<template>
    <div class="fsm-02">
        <div class="text-section">
            <h2>源文本</h2>
            <p class="origin-text">{{ originText }}</p>
        </div>
        <div class="text-section">
            <h2>解析结果</h2>
            <div class="parsed-text">
                <span
                    v-for="(item, index) in finalTextList"
                    :key="index"
                    :class="['text-item', `text-${item.type}`]"
                >
                    {{ item.text }}
                </span>
            </div>
        </div>
        <div class="text-section">
            <h2>数据结构</h2>
            <pre class="data-structure">{{ JSON.stringify(finalTextList, null, 2) }}</pre>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'

/**
 * 标记规则配置
 * 添加新类型只需要在这里添加一条配置即可
 */
interface MarkRule {
    /** 开始标记 */
    start: string
    /** 结束标记 */
    end: string
    /** 类型名称 */
    type: string
}

const MARK_RULES: MarkRule[] = [
    { start: '《', end: '》', type: 'bracket' },
    { start: '【', end: '】', type: 'square' },
    // 添加新类型示例：
    // { start: '「', end: '」', type: 'quotation' },
    { start: '<', end: '>', type: 'link' }
]

/**
 * 解析后的文本片段
 */
interface TextSegment {
    /** 文本内容 */
    text: string
    /** 文本类型 */
    type: string
    /** 在源文本中的起始位置 */
    startIndex: number
    /** 在源文本中的结束位置 */
    endIndex: number
}

const originText =
    '页面底部有详细的问题分析，说明，撒打算大阿森松岛却饿啊《免责协议》个共和国和付出《使用条款》，【意见反馈】，撒打算大<这是撒打算大睡>'

const finalTextList = ref<TextSegment[]>([])

/**
 * 解析文本
 * @param text - 要解析的文本
 */
const parseText = (text: string) => {
    finalTextList.value = []

    let i = 0
    let normalTextStart = 0
    let normalTextBuffer = ''

    while (i < text.length) {
        let matched = false

        // 检查是否匹配任何标记规则
        for (const rule of MARK_RULES) {
            // 检查开始标记
            if (text.slice(i).startsWith(rule.start)) {
                // 先保存之前的普通文本
                if (normalTextBuffer) {
                    finalTextList.value.push({
                        text: normalTextBuffer,
                        type: 'normal',
                        startIndex: normalTextStart,
                        endIndex: normalTextStart + normalTextBuffer.length
                    })
                    normalTextBuffer = ''
                }

                // 跳过开始标记
                i += rule.start.length
                const contentStart = i
                let content = ''

                // 查找结束标记
                while (i < text.length) {
                    if (text.slice(i).startsWith(rule.end)) {
                        // 找到结束标记，保存内容
                        finalTextList.value.push({
                            text: content,
                            type: rule.type,
                            startIndex: contentStart,
                            endIndex: contentStart + content.length
                        })
                        i += rule.end.length
                        matched = true
                        break
                    } else {
                        content += text[i]
                        i++
                    }
                }

                // 如果没找到结束标记，将内容作为普通文本处理
                if (!matched && content) {
                    normalTextBuffer = rule.start + content
                    normalTextStart = contentStart - rule.start.length
                }
                break
            }
        }

        // 如果没有匹配到任何标记，作为普通字符处理
        if (!matched) {
            if (normalTextBuffer === '') {
                normalTextStart = i
            }
            normalTextBuffer += text[i]
            i++
        }
    }

    // 处理剩余的普通文本
    if (normalTextBuffer) {
        finalTextList.value.push({
            text: normalTextBuffer,
            type: 'normal',
            startIndex: normalTextStart,
            endIndex: normalTextStart + normalTextBuffer.length
        })
    }
}

/**
 * 初始化
 */
onMounted(() => {
    parseText(originText)
})
</script>

<style scoped lang="less">
.fsm-02 {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.text-section {
    margin-bottom: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;

    h2 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 20px;
        font-weight: 600;
    }
}

.origin-text {
    margin: 0;
    padding: 15px;
    background: white;
    border-radius: 6px;
    font-size: 16px;
    line-height: 1.6;
    color: #333;
}

.parsed-text {
    padding: 15px;
    background: white;
    border-radius: 6px;
    font-size: 16px;
    line-height: 1.6;
    min-height: 50px;

    .text-item {
        display: inline;
        padding: 2px 4px;
        border-radius: 3px;
        transition: all 0.2s ease;

        // 普通文本样式
        &.text-normal {
            color: #333;
        }

        // 《》标记样式 - 黄色
        &.text-bracket {
            color: #f39c12;
            background-color: #fef5e7;
            font-weight: 500;
        }

        // 【】标记样式 - 绿色
        &.text-square {
            color: #27ae60;
            background-color: #eafaf1;
            font-weight: 500;
        }

        // 可以继续添加其他类型的样式
        // &.text-quotation {
        //   color: #3498db;
        //   background-color: #ebf5fb;
        //   font-weight: 500;
        // }
        &.text-link {
            color: #3498db;
            background-color: #ebf5fb;
            font-weight: 500;
        }
    }
}

.data-structure {
    margin: 0;
    padding: 15px;
    background: #2c3e50;
    border-radius: 6px;
    color: #ecf0f1;
    font-size: 13px;
    line-height: 1.6;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
}
</style>
