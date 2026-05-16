<template>
    <div class="fsm-01">
        <div class="traffic-light-container">
            <h2>交通灯 FSM 示例</h2>

            <!-- 交通灯显示 -->
            <div class="traffic-light">
                <div class="light red" :class="{ active: currentState === 'red' }"></div>
                <div class="light yellow" :class="{ active: currentState === 'yellow' }"></div>
                <div class="light green" :class="{ active: currentState === 'green' }"></div>
            </div>

            <!-- 状态信息 -->
            <div class="state-info">
                <p class="current-state">
                    当前状态: <strong>{{ currentState }}</strong>
                </p>
                <p class="available-events">可执行事件: {{ availableEvents.join(', ') || '无' }}</p>
            </div>

            <!-- 操作按钮 -->
            <div class="actions">
                <button @click="handleNext" :disabled="!canNext" class="action-btn">
                    切换到下一个状态
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
                        <span class="event">(事件: {{ item.event }})</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import FSM from './fsm'

/**
 * 交通灯状态类型
 */
type TrafficLightState = 'red' | 'yellow' | 'green'

/**
 * 交通灯事件类型
 */
type TrafficLightEvent = 'next'

/**
 * 状态转换历史记录
 */
interface HistoryItem {
    time: string
    oldState: TrafficLightState
    newState: TrafficLightState
    event: TrafficLightEvent
}

// 当前状态
const currentState = ref<TrafficLightState>('red')

// 状态转换历史
const history = ref<HistoryItem[]>([])

// 创建交通灯 FSM 实例
const trafficLightFSM = new FSM<TrafficLightState, TrafficLightEvent>({
    initialState: 'red',
    transitions: {
        red: {
            next: 'green' // 红灯 -> 绿灯
        },
        green: {
            next: 'yellow' // 绿灯 -> 黄灯
        },
        yellow: {
            next: 'red' // 黄灯 -> 红灯
        }
    },
    onStateChanged: (newState, oldState, event) => {
        // 更新当前状态
        currentState.value = newState

        // 记录状态转换历史
        history.value.unshift({
            time: new Date().toLocaleTimeString(),
            oldState,
            newState,
            event
        })

        // 限制历史记录数量
        if (history.value.length > 10) {
            history.value = history.value.slice(0, 10)
        }

        console.log(`交通灯状态变化: ${oldState} -> ${newState} (事件: ${event})`)
    }
})

// 初始化当前状态
currentState.value = trafficLightFSM.getState()

// 是否可以切换到下一个状态
const canNext = computed(() => {
    return trafficLightFSM.can('next')
})

// 可执行的事件列表
const availableEvents = computed(() => {
    return trafficLightFSM.getAvailableEvents()
})

/**
 * 处理切换到下一个状态
 */
const handleNext = () => {
    const success = trafficLightFSM.transition('next')
    if (!success) {
        console.warn('无法执行状态转换')
    }
}

/**
 * 处理重置状态
 */
const handleReset = () => {
    trafficLightFSM.reset()
    history.value = []
}

/**
 * 初始化
 */
const init = () => {
    console.log('交通灯 FSM 初始化完成')
    console.log('当前状态:', trafficLightFSM.getState())
    console.log('可执行事件:', trafficLightFSM.getAvailableEvents())
}

onMounted(() => {
    init()
})
</script>

<style scoped lang="less">
.fsm-01 {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    margin: 0 0 30px 0;
    text-align: center;
    color: #333;
    font-size: 24px;
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

    &:hover:not(:disabled) {
        background: #2980b9;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
    }

    &:disabled {
        background: #bdc3c7;
        cursor: not-allowed;
        opacity: 0.6;
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

    .event {
        color: #95a5a6;
        font-size: 12px;
    }
}
</style>
