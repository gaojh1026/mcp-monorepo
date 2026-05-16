<template>
    <div class="fsm-06">
        <div class="demo-container">
            <h2>步骤流程：FSM 管理支付/审批流程</h2>
            <p class="subtitle">使用有限状态机管理多步骤流程，确保步骤顺序和状态一致性</p>

            <!-- 步骤条 -->
            {{ currentStepStatus }}--{{ currentStepIndex }}
            <a-steps :current="currentStepIndex" :status="currentStepStatus" class="steps">
                <a-step
                    v-for="(step, index) in steps"
                    :key="step.key"
                    :title="step.title"
                    :description="step.description"
                />
            </a-steps>

            <!-- 操作按钮 -->
            <div class="actions">
                <a-button
                    v-if="canGoNext"
                    type="primary"
                    @click="handleNext"
                    :loading="isProcessing"
                >
                    {{ getNextButtonText() }}
                </a-button>
                <a-button v-if="canRetry" @click="handleRetry">重试</a-button>
                <a-button v-if="canReset" @click="handleReset">重新开始</a-button>
            </div>

            <!-- FSM 状态信息 -->
            <div class="fsm-info">
                <div>
                    当前状态：<strong>{{ currentStep }}</strong>
                </div>
                <div>可执行操作：{{ availableEvents.join(', ') || '无' }}</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FSM from './fsm'

/**
 * 支付流程状态类型
 */
type PaymentState = 'confirm' | 'payment' | 'processing' | 'completed' | 'error'
/**
 * 支付流程事件类型
 */
type PaymentEvent = 'next' | 'pay' | 'success' | 'fail' | 'retry' | 'reset'

// 步骤定义
const steps: { key: PaymentState; title: string; description: string }[] = [
    { key: 'confirm', title: '确认订单', description: '核对订单信息' },
    { key: 'payment', title: '支付', description: '选择支付方式并完成支付' },
    { key: 'processing', title: '处理中', description: '系统正在处理订单' },
    { key: 'completed', title: '完成', description: '支付成功，订单已确认' }
]

// 当前状态（使用 ref 使其响应式）
const currentStep = ref<PaymentState>('confirm')

// 创建支付流程 FSM 实例
const paymentFSM = new FSM<PaymentState, PaymentEvent>({
    initialState: 'confirm',
    transitions: {
        confirm: { next: 'payment' },
        payment: { pay: 'processing', fail: 'error' },
        processing: { success: 'completed', fail: 'error' },
        error: { retry: 'payment', reset: 'confirm' },
        completed: { reset: 'confirm' }
    },
    onStateChanged: (newState, oldState, event) => {
        console.log(`状态: ${oldState} -> ${newState} (事件: ${event})`)
        // 更新响应式状态
        currentStep.value = newState

        // 自动处理 processing 状态
        if (newState === 'processing') {
            simulateProcessing()
        }
    }
})

// 当前步骤索引
const currentStepIndex = computed(() => {
    const index = steps.findIndex(s => s.key === currentStep.value)
    if (currentStep.value === 'error') {
        return steps.findIndex(s => s.key === 'payment')
    }
    return index >= 0 ? index : 0
})

// 当前步骤状态
const currentStepStatus = computed(() => {
    return currentStep.value === 'error' ? 'error' : 'process'
})

// 获取每个步骤的状态
const getStepStatus = (stepKey: PaymentState, index: number) => {
    const current = currentStep.value
    const currentIndex = steps.findIndex(s => s.key === current)

    if (current === 'completed') {
        return 'finish'
    }

    if (current === 'error' && stepKey === 'payment') {
        return 'error'
    }

    if (index < currentIndex) {
        return 'finish'
    }

    if (stepKey === current) {
        return 'process'
    }

    return 'wait'
}

// 可执行的事件（依赖 currentStep 确保响应式更新）
const availableEvents = computed(() => {
    currentStep.value // 触发响应式追踪
    return paymentFSM.getAvailableEvents()
})

// 是否可以进入下一步
const canGoNext = computed(() => {
    currentStep.value // 触发响应式追踪
    return paymentFSM.can('next') || paymentFSM.can('pay')
})

// 是否可以重试
const canRetry = computed(() => {
    currentStep.value // 触发响应式追踪
    return paymentFSM.can('retry')
})

// 是否可以重置
const canReset = computed(() => {
    currentStep.value // 触发响应式追踪
    return paymentFSM.can('reset')
})

// 是否正在处理
const isProcessing = computed(() => currentStep.value === 'processing')

/**
 * 获取下一步按钮文本
 */
const getNextButtonText = () => {
    if (currentStep.value === 'confirm') {
        return '确认订单，进入支付'
    }
    if (currentStep.value === 'payment') {
        return '确认支付'
    }
    return '下一步'
}

/**
 * 处理下一步
 */
const handleNext = () => {
    if (currentStep.value === 'confirm') {
        paymentFSM.transition('next')
    } else if (currentStep.value === 'payment') {
        paymentFSM.transition('pay')
    }

    console.log(paymentFSM.getAvailableEvents())
}

/**
 * 处理重试
 */
const handleRetry = () => {
    paymentFSM.transition('retry')
}

/**
 * 处理重置
 */
const handleReset = () => {
    paymentFSM.transition('reset')
}

/**
 * 模拟处理过程
 */
const simulateProcessing = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    // 90% 成功率
    const success = Math.random() > 0.5
    paymentFSM.transition(success ? 'success' : 'fail')
}
</script>

<style scoped lang="less">
.fsm-06 {
    width: 100%;
    height: 100%;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    overflow-y: auto;
}

.demo-container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

h2 {
    margin: 0 0 10px 0;
    text-align: center;
    color: #333;
    font-size: 24px;
}

.subtitle {
    text-align: center;
    color: #666;
    margin: 0 0 30px 0;
    font-size: 14px;
}

.steps {
    margin-bottom: 40px;
}

.actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    justify-content: center;
}

.fsm-info {
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    font-size: 14px;
    color: #666;
    line-height: 1.8;

    strong {
        color: #333;
        font-weight: 600;
    }
}
</style>
