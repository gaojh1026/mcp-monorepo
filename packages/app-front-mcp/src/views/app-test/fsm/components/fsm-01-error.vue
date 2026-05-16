<template>
    <div class="fsm-error-demo">
        <div class="error-container">
            <h2>❌ 不使用 FSM 的问题示例</h2>
            <p class="warning">这个示例展示了传统状态管理方式容易出现的问题</p>

            <!-- 交通灯显示 -->
            <div class="traffic-light">
                <div class="light red" :class="{ active: isRed }"></div>
                <div class="light yellow" :class="{ active: isYellow }"></div>
                <div class="light green" :class="{ active: isGreen }"></div>
            </div>

            <!-- 问题展示区域 -->
            <div class="problems">
                <div class="problem-item" :class="{ active: problem1 }">
                    <span class="problem-icon">⚠️</span>
                    <span class="problem-text">问题1: 状态不一致（多个灯同时亮起）</span>
                </div>
                <div class="problem-item" :class="{ active: problem2 }">
                    <span class="problem-icon">⚠️</span>
                    <span class="problem-text">问题2: 非法状态转换（跳过中间状态）</span>
                </div>
                <div class="problem-item" :class="{ active: problem3 }">
                    <span class="problem-icon">⚠️</span>
                    <span class="problem-text">问题3: 状态管理混乱（难以追踪）</span>
                </div>
            </div>

            <!-- 当前状态显示 -->
            <div class="state-info">
                <div class="state-vars">
                    <p><strong>状态变量：</strong></p>
                    <p>
                        isRed:
                        <span :class="{ error: isRed && (isYellow || isGreen) }">{{ isRed }}</span>
                    </p>
                    <p>
                        isYellow:
                        <span :class="{ error: isYellow && (isRed || isGreen) }">{{
                            isYellow
                        }}</span>
                    </p>
                    <p>
                        isGreen:
                        <span :class="{ error: isGreen && (isRed || isYellow) }">{{
                            isGreen
                        }}</span>
                    </p>
                </div>
                <div class="current-state-display">
                    <p>
                        当前状态: <strong>{{ currentStateText }}</strong>
                    </p>
                </div>
            </div>

            <!-- 操作按钮（故意设计成容易出错的方式） -->
            <div class="actions">
                <button @click="setRed" class="action-btn red-btn">设置为红灯</button>
                <button @click="setYellow" class="action-btn yellow-btn">设置为黄灯</button>
                <button @click="setGreen" class="action-btn green-btn">设置为绿灯</button>
                <button @click="nextState" class="action-btn next-btn">下一个状态（有问题）</button>
                <button @click="randomState" class="action-btn random-btn">
                    随机状态（演示问题）
                </button>
                <button @click="reset" class="action-btn reset-btn">重置</button>
            </div>

            <!-- 错误日志 -->
            <div class="error-log" v-if="errorLogs.length > 0">
                <h3>❌ 错误日志</h3>
                <ul class="log-list">
                    <li v-for="(log, index) in errorLogs" :key="index" class="log-item">
                        <span class="log-time">{{ log.time }}</span>
                        <span class="log-message">{{ log.message }}</span>
                    </li>
                </ul>
            </div>

            <!-- 对比说明 -->
            <div class="comparison">
                <h3>💡 问题分析</h3>
                <ul class="comparison-list">
                    <li>
                        <strong>问题1：状态不一致</strong>
                        <p>
                            使用多个布尔变量（isRed, isYellow, isGreen）可能导致多个状态同时为
                            true，产生非法状态。
                        </p>
                    </li>
                    <li>
                        <strong>问题2：非法转换</strong>
                        <p>
                            可以直接从任何状态转换到任何状态，没有规则约束。比如可以从红灯直接跳到绿灯，跳过了黄灯。
                        </p>
                    </li>
                    <li>
                        <strong>问题3：条件判断复杂</strong>
                        <p>
                            每次状态转换都需要写复杂的 if-else
                            判断，容易遗漏边界情况，代码难以维护。
                        </p>
                    </li>
                    <li>
                        <strong>问题4：难以追踪</strong>
                        <p>状态变化没有统一的入口，难以追踪状态转换历史，调试困难。</p>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'

/**
 * 传统方式：使用多个布尔变量管理状态
 * 这种方式容易出现状态不一致的问题
 */
const isRed = ref(true)
const isYellow = ref(false)
const isGreen = ref(false)

// 上一个状态（用于追踪）
let previousState = 'red'

// 错误日志
const errorLogs = ref<Array<{ time: string; message: string }>>([])

/**
 * 添加错误日志
 */
const addErrorLog = (message: string) => {
    errorLogs.value.unshift({
        time: new Date().toLocaleTimeString(),
        message
    })
    if (errorLogs.value.length > 10) {
        errorLogs.value = errorLogs.value.slice(0, 10)
    }
}

/**
 * 检查状态一致性
 */
const checkStateConsistency = () => {
    const activeCount = [isRed.value, isYellow.value, isGreen.value].filter(Boolean).length

    if (activeCount === 0) {
        addErrorLog('❌ 错误：没有任何灯亮起（状态丢失）')
        return false
    }

    if (activeCount > 1) {
        addErrorLog(`❌ 错误：有 ${activeCount} 个灯同时亮起（状态不一致）`)
        return false
    }

    return true
}

/**
 * 问题1：直接设置状态，可能导致状态不一致
 */
const setRed = () => {
    isRed.value = true
    isYellow.value = false
    isGreen.value = false
    previousState = 'red'
    checkStateConsistency()
}

const setYellow = () => {
    isYellow.value = true
    isRed.value = false
    isGreen.value = false
    previousState = 'yellow'
    checkStateConsistency()
}

const setGreen = () => {
    isGreen.value = true
    isRed.value = false
    isYellow.value = false
    previousState = 'green'
    checkStateConsistency()
}

/**
 * 问题2：状态转换逻辑复杂且容易出错
 * 如果忘记更新某个变量，就会导致状态不一致
 */
const nextState = () => {
    // 复杂的条件判断，容易出错
    if (isRed.value) {
        // 问题：可能忘记设置 isRed = false
        isGreen.value = true
        // 如果这里忘记设置 isRed = false，就会导致红绿同时亮起
        // 故意留一个 bug：有时候忘记重置其他状态
        if (Math.random() > 0.7) {
            // 70% 的概率忘记重置 isRed
            addErrorLog('⚠️ 模拟 Bug：忘记重置 isRed，导致状态不一致')
        } else {
            isRed.value = false
        }
        previousState = 'green'
    } else if (isGreen.value) {
        isYellow.value = true
        // 同样的问题：可能忘记重置
        if (Math.random() > 0.7) {
            addErrorLog('⚠️ 模拟 Bug：忘记重置 isGreen，导致状态不一致')
        } else {
            isGreen.value = false
        }
        previousState = 'yellow'
    } else if (isYellow.value) {
        isRed.value = true
        if (Math.random() > 0.7) {
            addErrorLog('⚠️ 模拟 Bug：忘记重置 isYellow，导致状态不一致')
        } else {
            isYellow.value = false
        }
        previousState = 'red'
    }

    checkStateConsistency()
}

/**
 * 问题3：可以随意设置状态，没有规则约束
 * 这会导致非法状态转换（比如从红灯直接跳到绿灯）
 */
const randomState = () => {
    const states = ['red', 'yellow', 'green']
    const randomState = states[Math.floor(Math.random() * states.length)]

    // 检查是否是非法转换
    const currentState = isRed.value ? 'red' : isYellow.value ? 'yellow' : 'green'
    if (currentState === 'red' && randomState === 'green') {
        addErrorLog('❌ 非法转换：从红灯直接跳到绿灯（跳过了黄灯）')
    } else if (currentState === 'green' && randomState === 'red') {
        addErrorLog('❌ 非法转换：从绿灯直接跳到红灯（跳过了黄灯）')
    }

    // 直接设置状态，没有规则检查
    isRed.value = randomState === 'red'
    isYellow.value = randomState === 'yellow'
    isGreen.value = randomState === 'green'

    previousState = randomState
    checkStateConsistency()
}

/**
 * 重置状态
 */
const reset = () => {
    isRed.value = true
    isYellow.value = false
    isGreen.value = false
    previousState = 'red'
    errorLogs.value = []
}

/**
 * 计算当前状态文本
 */
const currentStateText = computed(() => {
    if (isRed.value && !isYellow.value && !isGreen.value) return 'red'
    if (isYellow.value && !isRed.value && !isGreen.value) return 'yellow'
    if (isGreen.value && !isRed.value && !isYellow.value) return 'green'
    if (isRed.value && isYellow.value) return 'red + yellow (错误)'
    if (isRed.value && isGreen.value) return 'red + green (错误)'
    if (isYellow.value && isGreen.value) return 'yellow + green (错误)'
    if (isRed.value && isYellow.value && isGreen.value) return 'red + yellow + green (错误)'
    return '无状态 (错误)'
})

/**
 * 检测问题
 */
const problem1 = computed(() => {
    const activeCount = [isRed.value, isYellow.value, isGreen.value].filter(Boolean).length
    return activeCount !== 1
})

const problem2 = computed(() => {
    // 检查是否有非法转换（这个需要历史记录，简化处理）
    return false // 这里简化，实际可以通过历史记录判断
})

const problem3 = computed(() => {
    return errorLogs.value.length > 0
})
</script>

<style scoped lang="less">
.fsm-error-demo {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.error-container {
    background: white;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
}

h2 {
    margin: 0 0 10px 0;
    text-align: center;
    color: #e74c3c;
    font-size: 24px;
}

.warning {
    text-align: center;
    color: #e67e22;
    font-size: 14px;
    margin-bottom: 20px;
    padding: 10px;
    background: #fff3cd;
    border-radius: 8px;
}

.traffic-light {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    margin-bottom: 30px;
    padding: 30px;
    background: #2c3e50;
    border-radius: 12px;
}

.light {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #34495e;
    border: 4px solid #1a252f;
    transition: all 0.3s ease;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);

    &.red {
        &.active {
            background: #e74c3c;
            box-shadow:
                inset 0 0 20px rgba(0, 0, 0, 0.3),
                0 0 30px rgba(231, 76, 60, 0.6);
        }
    }

    &.yellow {
        &.active {
            background: #f39c12;
            box-shadow:
                inset 0 0 20px rgba(0, 0, 0, 0.3),
                0 0 30px rgba(243, 156, 18, 0.6);
        }
    }

    &.green {
        &.active {
            background: #27ae60;
            box-shadow:
                inset 0 0 20px rgba(0, 0, 0, 0.3),
                0 0 30px rgba(39, 174, 96, 0.6);
        }
    }
}

.problems {
    margin-bottom: 20px;
}

.problem-item {
    padding: 10px;
    margin-bottom: 8px;
    background: #f8f9fa;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s ease;

    &.active {
        background: #fee;
        border: 2px solid #e74c3c;

        .problem-icon {
            animation: shake 0.5s;
        }
    }
}

.problem-icon {
    font-size: 20px;
}

.problem-text {
    color: #555;
    font-size: 14px;
}

.state-info {
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
}

.state-vars {
    margin-bottom: 10px;

    p {
        margin: 5px 0;
        font-size: 14px;
        color: #555;

        .error {
            color: #e74c3c;
            font-weight: bold;
        }
    }
}

.current-state-display {
    padding-top: 10px;
    border-top: 1px solid #ddd;

    p {
        margin: 0;
        font-size: 16px;
        color: #2c3e50;
    }
}

.actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}

.action-btn {
    padding: 10px 15px;
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    &.red-btn {
        background: #e74c3c;
    }

    &.yellow-btn {
        background: #f39c12;
    }

    &.green-btn {
        background: #27ae60;
    }

    &.next-btn {
        background: #3498db;
    }

    &.random-btn {
        background: #9b59b6;
    }

    &.reset-btn {
        background: #95a5a6;
    }
}

.error-log {
    margin-top: 20px;
    padding: 15px;
    background: #fee;
    border-radius: 8px;
    border: 2px solid #e74c3c;

    h3 {
        margin: 0 0 15px 0;
        color: #e74c3c;
        font-size: 18px;
    }
}

.log-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 150px;
    overflow-y: auto;
}

.log-item {
    padding: 8px;
    margin-bottom: 5px;
    background: white;
    border-radius: 4px;
    display: flex;
    gap: 10px;
    font-size: 12px;

    .log-time {
        color: #7f8c8d;
        min-width: 70px;
    }

    .log-message {
        color: #e74c3c;
    }
}

.comparison {
    margin-top: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;

    h3 {
        margin: 0 0 15px 0;
        color: #2c3e50;
        font-size: 18px;
    }
}

.comparison-list {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
        margin-bottom: 20px;
        padding: 15px;
        background: white;
        border-radius: 6px;
        border-left: 4px solid #e74c3c;

        strong {
            color: #e74c3c;
            display: block;
            margin-bottom: 8px;
        }

        p {
            margin: 0;
            color: #555;
            font-size: 14px;
            line-height: 1.6;
        }
    }
}

@keyframes shake {
    0%,
    100% {
        transform: translateX(0);
    }
    25% {
        transform: translateX(-5px);
    }
    75% {
        transform: translateX(5px);
    }
}
</style>
