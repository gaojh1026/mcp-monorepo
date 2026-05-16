<template>
    <div class="fsm-04">
        <div class="traffic-light-container">
            <h2>交通灯自动切换 FSM 示例</h2>
            <p class="desc">使用 SimpleFSM 实现，每2秒自动切换一次状态</p>

            <!-- 交通灯显示 -->
            <div class="traffic-light">
                <div class="light red" :class="{ active: currentState === 'red' }"></div>
                <div class="light yellow" :class="{ active: currentState === 'yellow' }"></div>
                <div class="light green" :class="{ active: currentState === 'green' }"></div>
            </div>

            <!-- 状态信息 -->
            <div class="state-info">
                <p class="current-state">
                    当前状态: <strong>{{ stateLabel }}</strong>
                </p>
                <p class="status-text">{{ statusText }}</p>
            </div>

            <!-- 控制按钮 -->
            <div class="actions">
                <button @click="handleToggle" class="action-btn" :class="{ stop: isRunning }">
                    {{ isRunning ? '停止自动切换' : '开始自动切换' }}
                </button>
                <button @click="handleReset" class="action-btn reset-btn">重置为初始状态</button>
            </div>

            <!-- 状态转换历史 -->
            <div class="history" v-if="history.length > 0">
                <h3>状态转换历史</h3>
                <ul class="history-list">
                    <li v-for="(item, index) in history" :key="index" class="history-item">
                        <span class="time">{{ item.time }}</span>
                        <span class="transition">
                            {{ item.oldState }}
                            <span class="arrow">→</span>
                            {{ item.newState }}
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 交通灯状态类型
 */
type TrafficLightState = 'red' | 'yellow' | 'green'

/**
 * 交通灯事件类型
 */
type TrafficLightEvent = 'tick'

/**
 * 状态转换历史记录
 */
interface HistoryItem {
    time: string
    oldState: string
    newState: string
}

/**
 * SimpleFSM 配置接口
 */
interface SimpleFSMConfig {
    initialState: TrafficLightState
    transitions: Record<TrafficLightState, Record<TrafficLightEvent, TrafficLightState>>
}

/**
 * 简单的有限状态机类
 */
class SimpleFSM {
    private state: TrafficLightState
    private transitions: Record<TrafficLightState, Record<TrafficLightEvent, TrafficLightState>>
    public onStateChanged: ((state: TrafficLightState) => void) | null = null

    constructor(config: SimpleFSMConfig) {
        this.state = config.initialState
        this.transitions = config.transitions
    }

    /**
     * 获取当前状态
     */
    getState(): TrafficLightState {
        return this.state
    }

    /**
     * 检查当前状态是否可以执行指定事件
     */
    can(event: TrafficLightEvent): boolean {
        const stateTransitions = this.transitions[this.state] || {}
        return !!stateTransitions[event]
    }

    /**
     * 执行状态转换
     */
    transition(event: TrafficLightEvent): boolean {
        // 使用 can(event) 判断当前状态是否允许该事件
        if (!this.can(event)) {
            return false
        }
        const stateTransitions = this.transitions[this.state] || {}
        const next = stateTransitions[event]
        if (next) {
            this.state = next
            if (this.onStateChanged) {
                this.onStateChanged(this.state)
            }
            return true
        }
        return false
    }

    /**
     * 重置到初始状态
     */
    reset(initialState: TrafficLightState): void {
        this.state = initialState
        if (this.onStateChanged) {
            this.onStateChanged(this.state)
        }
    }
}

// 状态映射
const stateLabelMap: Record<TrafficLightState, string> = {
    red: '🔴 红灯（stop）',
    yellow: '🟡 黄灯（wait）',
    green: '🟢 绿灯（go）'
}

// 交通灯 FSM 配置
const trafficLightTransitions: Record<
    TrafficLightState,
    Record<TrafficLightEvent, TrafficLightState>
> = {
    red: { tick: 'yellow' },
    yellow: { tick: 'green' },
    green: { tick: 'red' }
}

// 响应式数据
const currentState = ref<TrafficLightState>('red')
const isRunning = ref(false)
const history = ref<HistoryItem[]>([])

// 定时器ID
let intervalId: number | null = null

// 创建状态机实例
const trafficLightFSM = new SimpleFSM({
    initialState: 'red',
    transitions: trafficLightTransitions
})

// 设置状态变化回调
trafficLightFSM.onStateChanged = (newState: TrafficLightState) => {
    const oldState = currentState.value
    currentState.value = newState

    // 记录历史
    history.value.unshift({
        time: new Date().toLocaleTimeString(),
        oldState: stateLabelMap[oldState],
        newState: stateLabelMap[newState]
    })

    // 限制历史记录数量
    if (history.value.length > 10) {
        history.value = history.value.slice(0, 10)
    }

    console.log(`状态切换：${stateLabelMap[newState]}`)
}

// 计算属性
const stateLabel = computed(() => stateLabelMap[currentState.value])

const statusText = computed(() => {
    return isRunning.value ? '自动切换中...' : '已停止'
})

/**
 * 处理切换自动运行状态
 */
const handleToggle = () => {
    if (isRunning.value) {
        // 停止
        if (intervalId !== null) {
            clearInterval(intervalId)
            intervalId = null
        }
        isRunning.value = false
        console.log('交通灯自动切换已停止')
    } else {
        // 开始
        isRunning.value = true
        console.log('交通灯状态机已启动，初始状态：🔴 红灯（stop）')

        // 立即执行一次
        if (trafficLightFSM.can('tick')) {
            trafficLightFSM.transition('tick')
        }

        // 设置定时器，每2秒切换一次状态
        intervalId = window.setInterval(() => {
            // 在触发前使用 can('tick') 进行校验
            if (trafficLightFSM.can('tick')) {
                trafficLightFSM.transition('tick')
            } else {
                console.warn('当前状态不允许触发事件：tick')
            }
        }, 2000)
    }
}

/**
 * 处理重置状态
 */
const handleReset = () => {
    // 停止自动切换
    if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
    }
    isRunning.value = false

    // 重置状态机
    trafficLightFSM.reset('red')
    currentState.value = 'red'
    history.value = []

    console.log('交通灯已重置为初始状态')
}

/**
 * 组件挂载时初始化
 */
onMounted(() => {
    currentState.value = trafficLightFSM.getState()
    console.log('交通灯 FSM 组件已挂载')
})

/**
 * 组件卸载时清理定时器
 */
onUnmounted(() => {
    if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
    }
    console.log('交通灯 FSM 组件已卸载，定时器已清理')
})
</script>

<style scoped lang="less">
.fsm-04 {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.traffic-light-container {
    background: white;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 100%;
}

h2 {
    margin: 0 0 10px 0;
    text-align: center;
    color: #333;
    font-size: 24px;
}

.desc {
    text-align: center;
    color: #666;
    font-size: 14px;
    margin: 0 0 30px 0;
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
            animation: pulse 1.5s ease-in-out infinite;
        }
    }

    &.yellow {
        &.active {
            background: #f39c12;
            box-shadow:
                inset 0 0 20px rgba(0, 0, 0, 0.3),
                0 0 30px rgba(243, 156, 18, 0.6);
            animation: pulse 1.5s ease-in-out infinite;
        }
    }

    &.green {
        &.active {
            background: #27ae60;
            box-shadow:
                inset 0 0 20px rgba(0, 0, 0, 0.3),
                0 0 30px rgba(39, 174, 96, 0.6);
            animation: pulse 1.5s ease-in-out infinite;
        }
    }
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.8;
    }
}

.state-info {
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;

    p {
        margin: 8px 0;
        color: #555;
        font-size: 14px;

        strong {
            color: #2c3e50;
            font-size: 16px;
        }
    }

    .status-text {
        color: #7f8c8d;
        font-size: 13px;
        font-style: italic;
    }
}

.actions {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
}

.action-btn {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    background: #3498db;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
    }

    &:active {
        transform: translateY(0);
    }

    &.stop {
        background: #e74c3c;

        &:hover {
            background: #c0392b;
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
        }
    }

    &.reset-btn {
        background: #95a5a6;

        &:hover {
            background: #7f8c8d;
            box-shadow: 0 4px 12px rgba(149, 165, 166, 0.4);
        }
    }
}

.history {
    margin-top: 20px;

    h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 18px;
    }
}

.history-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
}

.history-item {
    padding: 10px;
    margin-bottom: 8px;
    background: #f8f9fa;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;

    .time {
        color: #7f8c8d;
        font-size: 12px;
        min-width: 80px;
    }

    .transition {
        flex: 1;
        color: #2c3e50;

        .arrow {
            margin: 0 8px;
            color: #3498db;
            font-weight: bold;
        }
    }
}
</style>
