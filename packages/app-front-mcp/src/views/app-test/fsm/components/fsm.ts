/**
 * 状态转换表类型定义
 * @template State - 状态类型
 * @template Event - 事件类型
 */
export type TransitionTable<State extends string, Event extends string> = {
    [key in State]?: {
        [key in Event]?: State
    }
}

/**
 * FSM 配置接口
 * @template State - 状态类型
 * @template Event - 事件类型
 */
export interface FSMConfig<State extends string, Event extends string> {
    /** 初始状态 */
    initialState: State
    /** 状态转换表 */
    transitions: TransitionTable<State, Event>
    /** 状态变化回调函数（可选） */
    onStateChanged?: (newState: State, oldState: State, event: Event) => void
    /** 状态变化前回调函数（可选） */
    onBeforeStateChange?: (newState: State, oldState: State, event: Event) => boolean | void
}

/**
 * 有限状态机类
 * 提供状态管理和状态转换功能
 * @template State - 状态类型
 * @template Event - 事件类型
 * @example
 * ```typescript
 * const fsm = new FSM({
 *   initialState: 'idle',
 *   transitions: {
 *     idle: { start: 'running' },
 *     running: { stop: 'idle', pause: 'paused' },
 *     paused: { resume: 'running', stop: 'idle' }
 *   },
 *   onStateChanged: (newState, oldState, event) => {
 *     console.log(`状态从 ${oldState} 转换到 ${newState}，触发事件: ${event}`)
 *   }
 * })
 *
 * fsm.transition('start') // true
 * fsm.getState() // 'running'
 * fsm.can('pause') // true
 * ```
 */
export class FSM<State extends string = string, Event extends string = string> {
    /** 当前状态 */
    private state: State
    /** 初始状态 */
    private initialState: State
    /** 状态转换表 */
    private transitions: TransitionTable<State, Event>
    /** 状态变化回调函数 */
    private onStateChanged?: (newState: State, oldState: State, event: Event) => void
    /** 状态变化前回调函数 */
    private onBeforeStateChange?: (newState: State, oldState: State, event: Event) => boolean | void

    /**
     * 创建有限状态机实例
     * @param config - FSM 配置对象
     */
    constructor(config: FSMConfig<State, Event>) {
        this.state = config.initialState
        this.initialState = config.initialState
        this.transitions = config.transitions
        this.onStateChanged = config.onStateChanged
        this.onBeforeStateChange = config.onBeforeStateChange
    }

    /**
     * 获取当前状态
     * @returns 当前状态
     */
    getState(): State {
        return this.state
    }

    /**
     * 检查是否处于指定状态
     * @param state - 要检查的状态
     * @returns 是否处于该状态
     */
    is(state: State): boolean {
        return this.state === state
    }

    /**
     * 检查当前状态是否可以执行指定事件
     * @param event - 要检查的事件
     * @returns 是否可以执行该事件
     */
    can(event: Event): boolean {
        const stateTransitions = this.transitions[this.state]
        if (!stateTransitions) {
            return false
        }
        return event in stateTransitions && stateTransitions[event] !== undefined
    }

    /**
     * 获取当前状态可以执行的所有事件
     * @returns 可执行的事件列表
     */
    getAvailableEvents(): Event[] {
        const stateTransitions = this.transitions[this.state]
        if (!stateTransitions) {
            return []
        }
        return Object.keys(stateTransitions) as Event[]
    }

    /**
     * 获取指定事件可以转换到的目标状态
     * @param event - 事件名称
     * @returns 目标状态，如果事件不可执行则返回 undefined
     */
    getTargetState(event: Event): State | undefined {
        if (!this.can(event)) {
            return undefined
        }
        const stateTransitions = this.transitions[this.state]
        return stateTransitions?.[event]
    }

    /**
     * 执行状态转换
     * @param event - 触发的事件
     * @returns 是否成功转换状态
     */
    transition(event: Event): boolean {
        // 检查是否可以执行该事件
        if (!this.can(event)) {
            return false
        }

        const stateTransitions = this.transitions[this.state]
        const nextState = stateTransitions?.[event]

        if (!nextState) {
            return false
        }

        const oldState = this.state

        // 执行状态变化前回调
        if (this.onBeforeStateChange) {
            const result = this.onBeforeStateChange(nextState, oldState, event)
            // 如果返回 false，则阻止状态转换
            if (result === false) {
                return false
            }
        }

        // 执行状态转换
        this.state = nextState

        // 执行状态变化回调
        if (this.onStateChanged) {
            this.onStateChanged(this.state, oldState, event)
        }

        return true
    }

    /**
     * 重置状态机到初始状态
     * @param initialState - 初始状态（可选，不传则使用配置中的初始状态）
     */
    reset(initialState?: State): void {
        const targetState = initialState !== undefined ? initialState : this.initialState
        const oldState = this.state

        // 执行状态变化前回调
        if (this.onBeforeStateChange) {
            const result = this.onBeforeStateChange(targetState, oldState, 'reset' as Event)
            if (result === false) {
                return
            }
        }

        this.state = targetState

        // 执行状态变化回调
        if (this.onStateChanged) {
            this.onStateChanged(this.state, oldState, 'reset' as Event)
        }
    }
}

export default FSM
