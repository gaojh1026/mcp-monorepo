<template>
    <div class="fsm-05">
        <div class="demo-container">
            <h2>表单提交：FSM vs 传统方式对比</h2>
            <p class="subtitle">展示使用有限状态机管理表单状态的优劣</p>

            <div class="comparison">
                <!-- 传统方式 -->
                <!-- <div class="demo-section">
          <div class="section-header">
            <h3>❌ 传统方式</h3>
            <span class="badge error">问题多</span>
          </div>
          <div class="form-container">
            <form @submit.prevent="handleSubmitTraditional" class="demo-form">
              <div class="form-group">
                <label>用户名</label>
                <input
                  v-model="traditionalForm.username"
                  type="text"
                  placeholder="请输入用户名"
                  :disabled="traditionalLoading"
                />
              </div>
              <div class="form-group">
                <label>密码</label>
                <input
                  v-model="traditionalForm.password"
                  type="password"
                  placeholder="请输入密码"
                  :disabled="traditionalLoading"
                />
              </div>
              <button
                type="submit"
                class="submit-btn"
                :disabled="traditionalLoading || traditionalSuccess"
              >
                <span v-if="traditionalLoading">提交中...</span>
                <span v-else-if="traditionalSuccess">提交成功 ✓</span>
                <span v-else>提交</span>
              </button>
              <div v-if="traditionalError" class="error-message">
                {{ traditionalError }}
              </div>
            </form>
          </div>
          <div class="code-preview">
            <div class="code-header">代码问题：</div>
            <ul class="problem-list">
              <li>❌ 多个布尔值状态难以管理（loading, success, error）</li>
              <li>❌ 状态之间可能产生冲突（如 loading 和 success 同时为 true）</li>
              <li>❌ 需要手动检查所有状态组合</li>
              <li>❌ 容易遗漏某些状态的处理</li>
              <li>❌ 代码逻辑分散，难以维护</li>
            </ul>
            <pre class="code-block"><code>// 传统方式：多个布尔值
const loading = ref(false)
const success = ref(false)
const error = ref('')

// 问题：状态可能冲突
if (loading.value && success.value) {
  // 这种情况理论上不应该发生，但代码无法阻止
}

// 需要手动检查所有状态
if (loading.value) {
  // 禁用按钮
} else if (success.value) {
  // 显示成功
} else if (error.value) {
  // 显示错误
}</code></pre>
          </div>
        </div> -->

                <!-- FSM 方式 -->
                <div class="demo-section">
                    <div class="section-header">
                        <h3>✅ FSM 方式</h3>
                        <span class="badge success">推荐</span>
                    </div>
                    <div class="form-container">
                        <form @submit.prevent="handleSubmitFSM" class="demo-form">
                            <div class="form-group">
                                <label>用户名</label>
                                <input
                                    v-model="fsmForm.username"
                                    type="text"
                                    placeholder="请输入用户名"
                                    :disabled="!fsmCanSubmit"
                                />
                            </div>
                            <div class="form-group">
                                <label>密码</label>
                                <input
                                    v-model="fsmForm.password"
                                    type="password"
                                    placeholder="请输入密码"
                                    :disabled="!fsmCanSubmit"
                                />
                            </div>
                            <button
                                type="submit"
                                class="submit-btn"
                                :disabled="!fsmCanSubmit"
                                :class="fsmButtonClass"
                            >
                                <span v-if="fsmState === 'submitting'">提交中...</span>
                                <span v-else-if="fsmState === 'success'">提交成功 ✓</span>
                                <span v-else>提交</span>
                            </button>
                            <div v-if="fsmState === 'error'" class="error-message">
                                {{ fsmError }}
                            </div>
                        </form>
                    </div>
                    <div class="code-preview">
                        <div class="code-header">代码优势：</div>
                        <ul class="advantage-list">
                            <li>✅ 单一状态源，状态清晰明确</li>
                            <li>✅ 状态转换受控，不会出现非法状态</li>
                            <li>✅ 可以检查当前状态允许的操作</li>
                            <li>✅ 状态转换逻辑集中管理</li>
                            <li>✅ 易于扩展和维护</li>
                        </ul>
                        <pre class="code-block"><code>// FSM 方式：状态机管理
const formFSM = new FSM({
  initialState: 'idle',
  transitions: {
    idle: { submit: 'submitting' },
    submitting: {
      success: 'success',
      error: 'error'
    },
    success: { reset: 'idle' },
    error: { retry: 'submitting', reset: 'idle' }
  }
})

// 状态转换受控，不会出现非法状态
formFSM.transition('submit') // 只能从 idle 转换
formFSM.can('submit') // 检查是否可以提交</code></pre>
                    </div>
                </div>
            </div>

            <!-- 状态对比 -->
            <div class="state-comparison">
                <h3>状态对比</h3>
                <div class="state-grid">
                    <div class="state-item">
                        <div class="state-label">传统方式状态：</div>
                        <div class="state-values">
                            <span :class="{ active: traditionalLoading }">loading</span>
                            <span :class="{ active: traditionalSuccess }">success</span>
                            <span :class="{ active: !!traditionalError }">error</span>
                        </div>
                        <div class="state-note">⚠️ 多个状态可能同时为 true</div>
                    </div>
                    <div class="state-item">
                        <div class="state-label">FSM 方式状态：</div>
                        <div class="state-value fsm-state" :class="fsmState">
                            {{ fsmState }}
                        </div>
                        <div class="state-note">✅ 同一时刻只有一个状态</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FSM from './fsm'

/**
 * 表单状态类型
 */
type FormState = 'idle' | 'submitting' | 'success' | 'error'

/**
 * 表单事件类型
 */
type FormEvent = 'submit' | 'success' | 'error' | 'reset' | 'retry'

// ============ 传统方式 ============
const traditionalForm = ref({
    username: '',
    password: ''
})

const traditionalLoading = ref(false)
const traditionalSuccess = ref(false)
const traditionalError = ref('')

/**
 * 传统方式提交表单
 */
const handleSubmitTraditional = async () => {
    // 问题1：需要手动重置所有状态
    traditionalLoading.value = true
    traditionalSuccess.value = false
    traditionalError.value = ''

    try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1500))

        // 问题2：需要手动设置多个状态
        traditionalLoading.value = false
        traditionalSuccess.value = true

        // 问题3：如果忘记重置 loading，会导致状态冲突
    } catch (err: any) {
        traditionalLoading.value = false
        traditionalError.value = err.message || '提交失败'
    }
}

// ============ FSM 方式 ============
const fsmForm = ref({
    username: '',
    password: ''
})

const fsmError = ref('')

// 创建表单 FSM 实例
const formFSM = new FSM<FormState, FormEvent>({
    initialState: 'idle',
    transitions: {
        idle: {
            submit: 'submitting'
        },
        submitting: {
            success: 'success',
            error: 'error'
        },
        success: {
            reset: 'idle'
        },
        error: {
            retry: 'submitting',
            reset: 'idle'
        }
    },
    onStateChanged: (newState, oldState, event) => {
        console.log(`表单状态: ${oldState} -> ${newState} (事件: ${event})`)

        // 状态变化时自动处理相关逻辑
        if (newState === 'error') {
            // 错误状态处理
        } else if (newState === 'success') {
            // 成功状态处理
        } else if (newState === 'idle') {
            // 重置状态处理
            fsmError.value = ''
        }
    }
})

// 当前状态
const fsmState = computed(() => formFSM.getState())

// 是否可以提交
const fsmCanSubmit = computed(() => {
    return formFSM.is('idle')
})

// 按钮样式类
const fsmButtonClass = computed(() => {
    return {
        'btn-submitting': fsmState.value === 'submitting',
        'btn-success': fsmState.value === 'success',
        'btn-error': fsmState.value === 'error'
    }
})

/**
 * FSM 方式提交表单
 */
const handleSubmitFSM = async () => {
    // 优势1：状态转换受控，只能从 idle 转换到 submitting
    if (!formFSM.can('submit')) {
        console.warn('当前状态不允许提交')
        return
    }

    // 优势2：状态转换自动管理，不会出现状态冲突
    formFSM.transition('submit')

    try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1500))

        // 优势3：状态转换清晰，只能转换到 success 或 error
        formFSM.transition('success')
    } catch (err: any) {
        fsmError.value = err.message || '提交失败'
        formFSM.transition('error')
    }
}

/**
 * 重置 FSM 表单
 */
const resetFSMForm = () => {
    formFSM.transition('reset')
    fsmForm.value = { username: '', password: '' }
}

/**
 * 重置传统表单
 */
const resetTraditionalForm = () => {
    traditionalLoading.value = false
    traditionalSuccess.value = false
    traditionalError.value = ''
    traditionalForm.value = { username: '', password: '' }
}
</script>

<style scoped lang="less">
.fsm-05 {
    width: 100%;
    height: 100%;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    overflow-y: auto;
}

.demo-container {
    max-width: 1400px;
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
    font-size: 28px;
}

.subtitle {
    text-align: center;
    color: #666;
    margin: 0 0 30px 0;
    font-size: 14px;
}

.comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-bottom: 30px;

    @media (max-width: 1200px) {
        grid-template-columns: 1fr;
    }
}

.demo-section {
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    background: #fafafa;

    &:first-child {
        border-color: #ff6b6b;
    }

    &:last-child {
        border-color: #51cf66;
    }
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
        margin: 0;
        font-size: 20px;
        color: #333;
    }
}

.badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;

    &.error {
        background: #ffe0e0;
        color: #c92a2a;
    }

    &.success {
        background: #d3f9d8;
        color: #2b8a3e;
    }
}

.form-container {
    margin-bottom: 20px;
}

.demo-form {
    .form-group {
        margin-bottom: 15px;

        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-size: 14px;
            font-weight: 500;
        }

        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.3s;

            &:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            &:disabled {
                background: #f5f5f5;
                cursor: not-allowed;
            }
        }
    }

    .submit-btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 6px;
        background: #667eea;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;

        &:hover:not(:disabled) {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        &:disabled {
            background: #bdc3c7;
            cursor: not-allowed;
            opacity: 0.6;
        }

        &.btn-submitting {
            background: #f39c12;
        }

        &.btn-success {
            background: #27ae60;
        }

        &.btn-error {
            background: #e74c3c;
        }
    }

    .error-message {
        margin-top: 10px;
        padding: 10px;
        background: #fee;
        border: 1px solid #fcc;
        border-radius: 6px;
        color: #c92a2a;
        font-size: 13px;
    }
}

.code-preview {
    background: #2d2d2d;
    border-radius: 8px;
    padding: 15px;
    color: #f8f8f2;
    font-size: 13px;
}

.code-header {
    margin-bottom: 10px;
    font-weight: 600;
    color: #ffd700;
}

.problem-list,
.advantage-list {
    margin: 10px 0;
    padding-left: 20px;

    li {
        margin: 8px 0;
        line-height: 1.6;
    }
}

.problem-list li {
    color: #ff6b6b;
}

.advantage-list li {
    color: #51cf66;
}

.code-block {
    margin: 15px 0 0 0;
    padding: 15px;
    background: #1e1e1e;
    border-radius: 6px;
    overflow-x: auto;

    code {
        color: #d4d4d4;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.6;
    }
}

.state-comparison {
    margin-top: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 12px;

    h3 {
        margin: 0 0 20px 0;
        color: #333;
        font-size: 18px;
    }
}

.state-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
}

.state-item {
    padding: 15px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
}

.state-label {
    font-size: 13px;
    color: #666;
    margin-bottom: 10px;
}

.state-values {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;

    span {
        padding: 6px 12px;
        background: #f0f0f0;
        border-radius: 4px;
        font-size: 12px;
        color: #999;
        transition: all 0.3s;

        &.active {
            background: #667eea;
            color: white;
        }
    }
}

.state-value {
    padding: 10px 15px;
    background: #f0f0f0;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 10px;
    text-align: center;
    transition: all 0.3s;

    &.idle {
        background: #e9ecef;
        color: #495057;
    }

    &.submitting {
        background: #fff3cd;
        color: #856404;
    }

    &.success {
        background: #d4edda;
        color: #155724;
    }

    &.error {
        background: #f8d7da;
        color: #721c24;
    }
}

.state-note {
    font-size: 12px;
    color: #666;
    font-style: italic;
}
</style>
