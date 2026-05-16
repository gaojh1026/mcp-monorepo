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
    { start: '<', end: '>', type: 'link' },
    { start: '{', end: '}', type: 'quotation' }
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
    '页面底部有详细的问题分析，说明，撒打算大阿森松岛却饿啊《免责协议》阿道夫啥啊啥《使用条款》，【意见反馈】，撒打算大<这是撒打算大睡>，12221231啊打算{啊打算}，12221231啊打算 《免责【高佳辉】协议》'

const finalTextList = ref<TextSegment[]>([])

/**
 * 轻量级 FSM 状态机
 * 状态：'normal' | 规则类型（如 'bracket', 'square', 'link'）
 */
class TextParserFSM {
    /** 当前状态 */
    private state: string = 'normal'
    /** 当前收集的文本内容 */
    private currentText: string = ''
    /** 当前文本的起始位置 */
    private currentStartIndex: number = 0
    /** 当前规则（如果不在 normal 状态） */
    private currentRule: MarkRule | null = null
    /** 结果数组 */
    private result: TextSegment[] = []
    /** 普通文本缓冲区 */
    private normalBuffer: string = ''
    /** 普通文本起始位置 */
    private normalStart: number = 0

    /**
     * 重置状态机
     */
    reset() {
        this.state = 'normal'
        this.currentText = ''
        this.currentStartIndex = 0
        this.currentRule = null
        this.result = []
        this.normalBuffer = ''
        this.normalStart = 0
    }

    /**
     * 获取当前状态
     */
    getState(): string {
        return this.state
    }

    /**
     * 进入标记状态
     * @param rule - 标记规则
     * @param startIndex - 内容起始位置
     */
    enterMark(rule: MarkRule, startIndex: number) {
        // 先保存普通文本
        this.saveNormalText()

        // 进入标记状态
        this.state = rule.type
        this.currentRule = rule
        this.currentText = ''
        this.currentStartIndex = startIndex
    }

    /**
     * 退出标记状态
     */
    exitMark() {
        if (this.currentRule && this.currentText) {
            this.result.push({
                text: this.currentText,
                type: this.currentRule.type,
                startIndex: this.currentStartIndex,
                endIndex: this.currentStartIndex + this.currentText.length
            })
        }

        // 回到普通状态
        this.state = 'normal'
        this.currentRule = null
        this.currentText = ''
    }

    /**
     * 添加字符到当前状态
     * @param char - 字符
     * @param index - 字符位置
     */
    addChar(char: string, index: number) {
        if (this.state === 'normal') {
            // 普通状态：收集到普通文本缓冲区
            if (this.normalBuffer === '') {
                this.normalStart = index
            }
            this.normalBuffer += char
        } else {
            // 标记状态：收集到当前文本
            if (this.currentText === '') {
                this.currentStartIndex = index
            }
            this.currentText += char
        }
    }

    /**
     * 保存普通文本
     */
    private saveNormalText() {
        if (this.normalBuffer) {
            this.result.push({
                text: this.normalBuffer,
                type: 'normal',
                startIndex: this.normalStart,
                endIndex: this.normalStart + this.normalBuffer.length
            })
            this.normalBuffer = ''
        }
    }

    /**
     * 完成解析，返回结果
     */
    finish(): TextSegment[] {
        // 如果还在标记状态，保存未闭合的标记内容
        if (this.state !== 'normal' && this.currentRule && this.currentText) {
            this.exitMark()
        }

        // 保存剩余的普通文本
        this.saveNormalText()

        return this.result
    }
}

/**
 * 解析文本
 * @param text - 要解析的文本
 */
const parseText = (text: string) => {
    const fsm = new TextParserFSM()
    fsm.reset()

    let i = 0

    while (i < text.length) {
        const currentState = fsm.getState()
        console.log('currentState---', currentState, text.slice(i))
        let matched = false

        // 如果在普通状态，检查是否有标记开始
        if (currentState === 'normal') {
            for (const rule of MARK_RULES) {
                if (text.slice(i).startsWith(rule.start)) {
                    // 找到开始标记，进入标记状态
                    i += rule.start.length
                    fsm.enterMark(rule, i)
                    matched = true
                    break
                }
            }
        } else {
            // 如果在标记状态，检查是否有结束标记
            const rule = MARK_RULES.find(r => r.type === currentState)
            if (rule && text.slice(i).startsWith(rule.end)) {
                // 找到结束标记，退出标记状态
                fsm.exitMark()
                i += rule.end.length
                matched = true
                continue
            }
        }

        // 如果没有匹配到标记，添加当前字符
        if (!matched) {
            fsm.addChar(text[i], i)
            i++
        }
    }

    // 完成解析
    finalTextList.value = fsm.finish()
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
        &.text-quotation {
            color: #db34ba;
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
