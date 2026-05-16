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
    /** 在源文本中的起始位置（包含开始标记的位置） */
    startIndex: number
    /** 在源文本中的结束位置（包含结束标记的位置） */
    endIndex: number
    /** 内容起始位置（不包含开始标记） */
    contentStartIndex?: number
    /** 内容结束位置（不包含结束标记） */
    contentEndIndex?: number
}

const originText =
    '页面底部有详细的问题分析，说明，撒打算大阿森松岛却饿啊《免责协议》《使用条款》，【意见反馈】，撒打算大<这是撒打算大睡>，12221231啊打算{啊打算}，12221231啊打算 《免责【高佳辉】协议》'

const finalTextList = ref<TextSegment[]>([])

/**
 * 状态栈中的状态项
 */
interface StateItem {
    /** 状态类型 */
    type: string
    /** 规则 */
    rule: MarkRule
    /** 文本内容（只包含标记内的文本，不包含标记符号） */
    text: string
    /** 内容起始位置（标记开始后的位置） */
    contentStartIndex: number
    /** 标记开始位置（包含开始标记的位置） */
    markStartIndex: number
}

/**
 * 支持嵌套的 FSM 状态机
 * 使用状态栈来支持嵌套标记（如《免责【高佳辉】协议》）
 */
class TextParserFSM {
    /** 状态栈：支持嵌套状态 */
    private stateStack: StateItem[] = []
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
        this.stateStack = []
        this.result = []
        this.normalBuffer = ''
        this.normalStart = 0
    }

    /**
     * 获取当前状态（栈顶状态）
     */
    getState(): string {
        return this.stateStack.length > 0
            ? this.stateStack[this.stateStack.length - 1].type
            : 'normal'
    }

    /**
     * 获取状态栈（用于外部访问）
     */
    getStateStack(): StateItem[] {
        return this.stateStack
    }

    /**
     * 进入标记状态（压入状态栈）
     * @param rule - 标记规则
     * @param markStartIndex - 标记开始位置（包含开始标记的位置）
     * @param contentStartIndex - 内容起始位置（开始标记后的位置）
     */
    enterMark(rule: MarkRule, markStartIndex: number, contentStartIndex: number) {
        // 如果当前是普通状态，先保存普通文本
        if (this.stateStack.length === 0) {
            this.saveNormalText()
        } else {
            // 如果当前在标记状态，将开始标记符号添加到外层标记的文本中
            const parentState = this.stateStack[this.stateStack.length - 1]
            parentState.text += rule.start
        }

        // 将新状态压入栈
        this.stateStack.push({
            type: rule.type,
            rule,
            text: '',
            contentStartIndex,
            markStartIndex
        })
    }

    /**
     * 退出标记状态（弹出状态栈）
     * @param endIndex - 结束标记后的位置
     */
    exitMark(endIndex: number) {
        if (this.stateStack.length === 0) {
            return
        }

        const state = this.stateStack.pop()!
        const contentEndIndex = state.contentStartIndex + state.text.length

        // 保存当前标记的内容（只保存文本内容，不包含标记符号）
        if (state.text) {
            this.result.push({
                text: state.text,
                type: state.type,
                startIndex: state.contentStartIndex,
                endIndex: contentEndIndex,
                contentStartIndex: state.contentStartIndex,
                contentEndIndex
            })
        }

        // 如果栈中还有状态，说明是嵌套的
        // 将内层标记的完整内容（包括标记符号）添加到外层标记的文本中
        // 这样外层标记的文本会包含内层标记的完整表示
        if (this.stateStack.length > 0) {
            const parentState = this.stateStack[this.stateStack.length - 1]
            // 将内层标记的完整内容（开始标记 + 文本 + 结束标记）添加到外层
            const fullContent = state.rule.start + state.text + state.rule.end
            parentState.text += fullContent
        }
    }

    /**
     * 添加字符到当前状态
     * @param char - 字符
     * @param index - 字符位置
     */
    addChar(char: string, index: number) {
        if (this.stateStack.length === 0) {
            // 普通状态：收集到普通文本缓冲区
            if (this.normalBuffer === '') {
                this.normalStart = index
            }
            this.normalBuffer += char
        } else {
            // 标记状态：收集到栈顶状态的文本
            const currentState = this.stateStack[this.stateStack.length - 1]
            currentState.text += char
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
        // 处理未闭合的标记（从栈顶开始）
        while (this.stateStack.length > 0) {
            const state = this.stateStack.pop()!
            if (state.text) {
                const contentEndIndex = state.contentStartIndex + state.text.length
                this.result.push({
                    text: state.text,
                    type: state.type,
                    startIndex: state.contentStartIndex,
                    endIndex: contentEndIndex,
                    contentStartIndex: state.contentStartIndex,
                    contentEndIndex
                })
            }
        }

        // 保存剩余的普通文本
        this.saveNormalText()

        // 按照位置排序，并处理重叠（内层优先）
        return this.result.sort((a, b) => {
            if (a.startIndex !== b.startIndex) {
                return a.startIndex - b.startIndex
            }
            // 如果起始位置相同，内层（更小的范围）优先
            return b.endIndex - b.startIndex - (a.endIndex - a.startIndex)
        })
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
        let matched = false

        // 检查是否有标记开始（支持嵌套，所以在任何状态都可以进入新标记）
        for (const rule of MARK_RULES) {
            if (text.slice(i).startsWith(rule.start)) {
                // 找到开始标记，进入标记状态（支持嵌套）
                const markStartIndex = i // 标记开始位置（包含开始标记）
                i += rule.start.length
                const contentStartIndex = i // 内容开始位置（开始标记后）
                fsm.enterMark(rule, markStartIndex, contentStartIndex)
                matched = true
                break
            }
        }

        // 如果没有匹配到开始标记，检查是否有结束标记
        if (!matched && currentState !== 'normal') {
            const stateStack = fsm.getStateStack()
            if (stateStack.length > 0) {
                const currentStateItem = stateStack[stateStack.length - 1]
                const rule = currentStateItem.rule
                if (text.slice(i).startsWith(rule.end)) {
                    // 退出当前标记状态
                    i += rule.end.length
                    fsm.exitMark(i)
                    matched = true
                    continue
                }
            }
        }

        // 如果没有匹配到任何标记，添加当前字符
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
