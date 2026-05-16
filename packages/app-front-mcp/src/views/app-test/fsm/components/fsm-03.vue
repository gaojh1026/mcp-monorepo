<template>
    <div class="fsm-demo-container">
        <div class="fsm-header">
            <h2>Vue3 + TS + Less 有限状态机(FSM) 演示</h2>
            <p class="desc">核心规则：状态切换只能通过【合法事件】触发，非法切换会被拦截</p>
        </div>

        <!-- 状态机核心信息区 -->
        <div class="fsm-main">
            <div class="state-card">
                <h3>当前状态</h3>
                <div class="current-state" :class="currentState">{{ currentStateLabel }}</div>
            </div>

            <div class="event-card">
                <h3>可触发的合法事件</h3>
                <div class="event-btn-group">
                    <!-- 遍历所有事件，绑定触发方法 -->
                    <button
                        v-for="event in allEvents"
                        :key="event"
                        class="event-btn"
                        @click="handleTriggerEvent(event)"
                    >
                        触发：{{ event }}
                    </button>
                </div>
            </div>
        </div>

        <!-- 反馈信息+历史记录 -->
        <div class="fsm-footer">
            <div class="feedback" :class="feedbackType">{{ feedbackMsg }}</div>
            <div class="history-card">
                <h3>状态变更历史记录</h3>
                <ul class="history-list" v-if="stateHistory.length">
                    <li v-for="(item, index) in stateHistory" :key="index">
                        {{ index + 1 }}. {{ item }}
                    </li>
                </ul>
                <p v-else class="empty-history">暂无状态变更记录</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * ===================== 第一步：定义状态机核心类型（TS强约束，核心） =====================
 * 1. State: 声明所有【合法状态】的联合类型，杜绝非法状态
 * 2. Event: 声明所有【合法事件】的联合类型，杜绝非法事件
 * 3. TransitionMap: 状态流转映射表，约束「当前状态+触发事件」=>「目标状态」的合法规则
 */
type State = 'idle' | 'loading' | 'success' | 'error'
type Event = 'fetch' | 'complete' | 'fail' | 'retry' | 'reset'
type TransitionMap = {
    [S in State]: {
        [E in Event]?: State
    }
}

/**
 * ===================== 第二步：配置核心参数 =====================
 * 1. 状态流转规则：定义【当前状态】触发【某个事件】能切换到【哪个目标状态】
 *    未配置的「状态+事件」组合 = 非法操作，会被拦截
 * 2. 状态中文映射：用于页面展示，提升可读性
 */
// 核心-状态流转规则（重中之重，FSM的核心约束）
const transitionRules: TransitionMap = {
    idle: { fetch: 'loading' }, // 空闲状态下，触发fetch事件 → 加载中
    loading: { complete: 'success', fail: 'error' }, // 加载中 → 成功/失败
    success: { retry: 'loading', reset: 'idle' }, // 成功状态 → 重试/重置
    error: { retry: 'loading', reset: 'idle' } // 失败状态 → 重试/重置
}

// 状态中文映射
const stateLabelMap = {
    idle: '空闲',
    loading: '加载中',
    success: '操作成功',
    error: '操作失败'
}

// 所有合法事件（遍历类型生成，无需手动维护）
const allEvents: Event[] = ['fetch', 'complete', 'fail', 'retry', 'reset']

/**
 * ===================== 第三步：状态机核心逻辑 =====================
 */
// 响应式数据：当前状态、反馈信息、状态历史记录
const currentState = ref<State>('idle')
const feedbackMsg = ref('初始化完成，当前处于【空闲】状态')
const feedbackType = ref('success')
const stateHistory = ref<string[]>([`初始化 - 进入【空闲】状态`])

// 计算属性：当前状态的中文展示
const currentStateLabel = computed(() => stateLabelMap[currentState.value])

/**
 * 触发事件的核心方法（状态机入口）
 * @param event 要触发的事件
 */
const handleTriggerEvent = (event: Event) => {
    // 1. 获取当前状态下，触发该事件能切换到的目标状态
    const targetState = transitionRules[currentState.value][event]

    // 2. 非法操作：当前状态下不允许触发该事件 → 拦截并提示
    if (!targetState) {
        feedbackMsg.value = `❌ 非法操作：【${stateLabelMap[currentState.value]}】状态下，禁止触发【${event}】事件`
        feedbackType.value = 'error'
        return
    }

    // 3. 合法操作：执行状态切换（完整的状态变更生命周期）
    const prevState = currentState.value
    const prevStateLabel = stateLabelMap[prevState]
    const targetStateLabel = stateLabelMap[targetState]

    // ✅ 生命周期钩子1：离开当前状态
    onExitState(prevState)
    // ✅ 执行状态变更
    currentState.value = targetState
    // ✅ 生命周期钩子2：进入目标状态
    onEnterState(targetState)
    // ✅ 生命周期钩子3：状态变更成功
    onStateChanged(prevState, targetState, event)

    // 更新反馈信息
    feedbackMsg.value = `✅ 切换成功：【${prevStateLabel}】→触发【${event}】→【${targetStateLabel}】`
    feedbackType.value = 'success'
    // 追加历史记录
    stateHistory.value.push(
        `${new Date().toLocaleTimeString()} - ${prevStateLabel} → ${targetStateLabel} (触发事件：${event})`
    )
}

/**
 * ===================== 可选：状态机生命周期钩子（状态动作回调） =====================
 * 可在这里编写【进入状态/离开状态/状态变更】的业务逻辑，比如：
 * - 进入loading：开启loading动画、发起请求
 * - 进入success：关闭loading、展示成功提示、请求成功回调
 * - 进入error：关闭loading、展示失败提示、请求失败回调
 * - 离开某个状态：清除定时器、取消请求等
 */
// 离开某个状态时执行
const onExitState = (state: State) => {
    console.log(`[FSM] 离开状态 →`, state, stateLabelMap[state])
    // 示例：离开loading状态时，可关闭loading动画
    if (state === 'loading') {
        // do something...
    }
}

// 进入某个状态时执行
const onEnterState = (state: State) => {
    console.log(`[FSM] 进入状态 →`, state, stateLabelMap[state])
    // 示例：进入success/error时，可执行对应的业务逻辑
    switch (state) {
        case 'success':
            // 成功回调：比如提交表单成功、请求数据成功
            break
        case 'error':
            // 失败回调：比如提交表单失败、请求数据失败
            break
        case 'loading':
            // 加载中：比如开启loading动画、发起异步请求
            break
    }
}

// 状态变更完成后执行（能拿到【上一个状态/当前状态/触发事件】完整信息）
const onStateChanged = (prevState: State, currentState: State, event: Event) => {
    console.log(`[FSM] 状态变更完成 →`, { prevState, currentState, event })
}
</script>

<style lang="less" scoped>
// 全局样式
.fsm-demo-container {
    max-width: 1000px;
    margin: 50px auto;
    padding: 0 20px;
    font-family: 'Microsoft YaHei', sans-serif;
    background: #f9fafb;
    border-radius: 12px;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
    padding: 30px;
}

// 头部样式
.fsm-header {
    text-align: center;
    margin-bottom: 40px;
    h2 {
        color: #165dff;
        margin: 0 0 8px 0;
        font-size: 24px;
    }
    .desc {
        color: #666;
        font-size: 14px;
        margin: 0;
    }
}

// 主体内容区
.fsm-main {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 40px;
    flex-wrap: wrap;

    .state-card,
    .event-card {
        flex: 1;
        min-width: 400px;
        background: #fff;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 1px 10px rgba(0, 0, 0, 0.05);
        h3 {
            color: #333;
            margin: 0 0 20px 0;
            font-size: 18px;
            border-left: 4px solid #165dff;
            padding-left: 10px;
        }
    }

    // 当前状态样式
    .current-state {
        font-size: 28px;
        font-weight: bold;
        text-align: center;
        padding: 30px 0;
        border-radius: 8px;
        color: #fff;
        &.idle {
            background: #67c23a;
        }
        &.loading {
            background: #409eff;
        }
        &.success {
            background: #1989fa;
        }
        &.error {
            background: #f56c6c;
        }
    }

    // 事件按钮组
    .event-btn-group {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }
    .event-btn {
        padding: 10px 18px;
        background: #165dff;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        &:hover {
            background: #0e4bdb;
            transform: translateY(-2px);
        }
        &:active {
            transform: translateY(0);
        }
    }
}

// 底部反馈+历史记录
.fsm-footer {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.05);

    .feedback {
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 15px;
        font-weight: 500;
        &.success {
            background: #e8f5e9;
            color: #2e7d32;
        }
        &.error {
            background: #ffebee;
            color: #c62828;
        }
    }

    .history-card {
        h3 {
            color: #333;
            margin: 0 0 15px 0;
            font-size: 16px;
        }
        .history-list {
            padding-left: 20px;
            margin: 0;
            li {
                color: #666;
                padding: 6px 0;
                border-bottom: 1px solid #f5f5f5;
                font-size: 14px;
            }
        }
        .empty-history {
            color: #999;
            font-size: 14px;
            margin: 0;
        }
    }
}
</style>
