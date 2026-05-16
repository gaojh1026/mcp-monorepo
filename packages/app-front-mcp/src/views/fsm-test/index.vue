<template>
    <div class="fsm-test-page">
        <div class="fsm-test-container">
            <div class="fsm-header">
                <h1>有限状态机（FSM）测试页面</h1>
                <p class="desc">演示有限状态机的核心概念：状态转换、事件触发、非法操作拦截</p>
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
                        <button
                            v-for="event in allEvents"
                            :key="event"
                            class="event-btn"
                            :class="{ disabled: !canTriggerEvent(event) }"
                            @click="handleTriggerEvent(event)"
                        >
                            {{ eventLabelMap[event] }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- 反馈信息 -->
            <div class="fsm-feedback">
                <div class="feedback" :class="feedbackType">{{ feedbackMsg }}</div>
            </div>

            <!-- 状态转换历史记录 -->
            <div class="history-card">
                <h3>状态变更历史记录</h3>
                <ul class="history-list" v-if="stateHistory.length">
                    <li v-for="(item, index) in stateHistory" :key="index">
                        <span class="history-index">{{ index + 1 }}.</span>
                        <span class="history-content">{{ item }}</span>
                    </li>
                </ul>
                <p v-else class="empty-history">暂无状态变更记录</p>
                <button v-if="stateHistory.length > 0" @click="clearHistory" class="clear-btn">
                    清空历史
                </button>
            </div>

            <!-- 操作按钮 -->
            <div class="actions">
                <button @click="handleReset" class="action-btn reset-btn">重置状态机</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FSM from '../app-test/fsm/components/fsm'

/**
 * 状态类型定义
 */
type State = 'idle' | 'loading' | 'success' | 'error'

/**
 * 事件类型定义
 */
type Event = 'fetch' | 'complete' | 'fail' | 'retry' | 'reset'

/**
 * 状态中文映射
 */
const stateLabelMap: Record<State, string> = {
    idle: '空闲',
    loading: '加载中',
    success: '操作成功',
    error: '操作失败'
}

/**
 * 事件中文映射
 */
const eventLabelMap: Record<Event, string> = {
    fetch: '开始加载',
    complete: '完成',
    fail: '失败',
    retry: '重试',
    reset: '重置'
}

/**
 * 所有合法事件列表
 */
const allEvents: Event[] = ['fetch', 'complete', 'fail', 'retry', 'reset']

/**
 * 响应式数据
 */
const currentState = ref<State>('idle')
const feedbackMsg = ref('初始化完成，当前处于【空闲】状态')
const feedbackType = ref<'success' | 'error'>('success')
const stateHistory = ref<string[]>([`初始化 - 进入【${stateLabelMap.idle}】状态`])

/**
 * 创建 FSM 实例
 */
const fsm = new FSM<State, Event>({
    initialState: 'idle',
    transitions: {
        idle: {
            fetch: 'loading' // 空闲状态下，触发fetch事件 → 加载中
        },
        loading: {
            complete: 'success', // 加载中 → 成功
            fail: 'error' // 加载中 → 失败
        },
        success: {
            retry: 'loading', // 成功状态 → 重试
            reset: 'idle' // 成功状态 → 重置
        },
        error: {
            retry: 'loading', // 失败状态 → 重试
            reset: 'idle' // 失败状态 → 重置
        }
    },
    onStateChanged: (newState, oldState, event) => {
        // 更新当前状态
        currentState.value = newState

        // 记录状态转换历史
        const time = new Date().toLocaleTimeString()
        const oldStateLabel = stateLabelMap[oldState]
        const newStateLabel = stateLabelMap[newState]
        const eventLabel = eventLabelMap[event]

        stateHistory.value.unshift(
            `${time} - 【${oldStateLabel}】→ 触发【${eventLabel}】→ 【${newStateLabel}】`
        )

        // 限制历史记录数量
        if (stateHistory.value.length > 20) {
            stateHistory.value = stateHistory.value.slice(0, 20)
        }

        console.log(`[FSM] 状态变化: ${oldState} -> ${newState} (事件: ${event})`)
    }
})

/**
 * 计算属性：当前状态的中文展示
 */
const currentStateLabel = computed(() => stateLabelMap[currentState.value])

/**
 * 检查是否可以触发指定事件
 * @param event 要检查的事件
 * @returns 是否可以触发
 */
const canTriggerEvent = (event: Event): boolean => {
    return fsm.can(event)
}

/**
 * 触发事件的核心方法
 * @param event 要触发的事件
 */
const handleTriggerEvent = (event: Event) => {
    // 检查是否可以执行该事件
    if (!fsm.can(event)) {
        feedbackMsg.value = `❌ 非法操作：【${stateLabelMap[currentState.value]}】状态下，禁止触发【${eventLabelMap[event]}】事件`
        feedbackType.value = 'error'
        return
    }

    // 执行状态转换
    const success = fsm.transition(event)

    if (success) {
        const newState = fsm.getState()
        const prevStateLabel = stateLabelMap[currentState.value]
        const newStateLabel = stateLabelMap[newState]

        // 更新反馈信息（状态已经在 onStateChanged 回调中更新）
        feedbackMsg.value = `✅ 切换成功：【${prevStateLabel}】→ 触发【${eventLabelMap[event]}】→ 【${newStateLabel}】`
        feedbackType.value = 'success'
    } else {
        feedbackMsg.value = `❌ 状态转换失败`
        feedbackType.value = 'error'
    }
}

/**
 * 重置状态机
 */
const handleReset = () => {
    fsm.reset()
    currentState.value = fsm.getState()
    feedbackMsg.value = `🔄 状态机已重置为【${stateLabelMap[currentState.value]}】状态`
    feedbackType.value = 'success'
    stateHistory.value = [`重置 - 进入【${stateLabelMap[currentState.value]}】状态`]
}

/**
 * 清空历史记录
 */
const clearHistory = () => {
    stateHistory.value = []
    feedbackMsg.value = '历史记录已清空'
    feedbackType.value = 'success'
}

/**
 * 初始化
 */
const init = () => {
    console.log('FSM 测试页面初始化完成')
    console.log('当前状态:', fsm.getState())
    console.log('可执行事件:', fsm.getAvailableEvents())
}

onMounted(() => {
    init()
})
</script>

<style lang="less" scoped>
.fsm-test-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}

.fsm-test-container {
    max-width: 1000px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.fsm-header {
    text-align: center;
    margin-bottom: 40px;

    h1 {
        color: #333;
        margin: 0 0 12px 0;
        font-size: 28px;
        font-weight: 600;
    }

    .desc {
        color: #666;
        font-size: 15px;
        margin: 0;
        line-height: 1.6;
    }
}

.fsm-main {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 30px;
    flex-wrap: wrap;

    .state-card,
    .event-card {
        flex: 1;
        min-width: 300px;
        background: #f8f9fa;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

        h3 {
            color: #333;
            margin: 0 0 20px 0;
            font-size: 18px;
            font-weight: 600;
            border-left: 4px solid #667eea;
            padding-left: 12px;
        }
    }

    .current-state {
        font-size: 32px;
        font-weight: bold;
        text-align: center;
        padding: 40px 20px;
        border-radius: 8px;
        color: #fff;
        transition: all 0.3s ease;

        &.idle {
            background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
        }

        &.loading {
            background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
        }

        &.success {
            background: linear-gradient(135deg, #1989fa 0%, #409eff 100%);
        }

        &.error {
            background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
        }
    }

    .event-btn-group {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }

    .event-btn {
        padding: 12px 20px;
        background: #667eea;
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);

        &:hover:not(.disabled) {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
        }

        &:active:not(.disabled) {
            transform: translateY(0);
        }

        &.disabled {
            background: #d3d3d3;
            cursor: not-allowed;
            opacity: 0.6;
            box-shadow: none;
        }
    }
}

.fsm-feedback {
    margin-bottom: 30px;

    .feedback {
        padding: 16px 20px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 500;
        line-height: 1.6;

        &.success {
            background: #e8f5e9;
            color: #2e7d32;
            border-left: 4px solid #4caf50;
        }

        &.error {
            background: #ffebee;
            color: #c62828;
            border-left: 4px solid #f44336;
        }
    }
}

.history-card {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 30px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    h3 {
        color: #333;
        margin: 0 0 20px 0;
        font-size: 18px;
        font-weight: 600;
        border-left: 4px solid #667eea;
        padding-left: 12px;
    }

    .history-list {
        list-style: none;
        padding: 0;
        margin: 0 0 16px 0;
        max-height: 300px;
        overflow-y: auto;

        li {
            padding: 12px;
            margin-bottom: 8px;
            background: #fff;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: #555;
            border-left: 3px solid #667eea;
            transition: all 0.2s ease;

            &:hover {
                background: #f0f0f0;
                transform: translateX(4px);
            }

            .history-index {
                color: #999;
                font-weight: 600;
                min-width: 24px;
            }

            .history-content {
                flex: 1;
            }
        }
    }

    .empty-history {
        color: #999;
        font-size: 14px;
        margin: 0;
        text-align: center;
        padding: 20px;
    }

    .clear-btn {
        padding: 8px 16px;
        background: #95a5a6;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s ease;

        &:hover {
            background: #7f8c8d;
        }
    }
}

.actions {
    display: flex;
    justify-content: center;
    gap: 12px;

    .action-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 15px;
        font-weight: 500;
        transition: all 0.3s ease;

        &.reset-btn {
            background: #95a5a6;
            color: #fff;
            box-shadow: 0 2px 4px rgba(149, 165, 166, 0.3);

            &:hover {
                background: #7f8c8d;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(149, 165, 166, 0.4);
            }
        }
    }
}
</style>
