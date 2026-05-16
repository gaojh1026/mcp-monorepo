/**
 * Atomic Design 按钮组件系统
 * 基于 Atomic Design 思维构建的按钮组件库
 */

// Atoms 层 - 原子组件
export { default as BaseButton } from './atoms/BaseButton.vue'

// Molecules 层 - 分子组件
export { default as IconButton } from './molecules/IconButton.vue'

// Organisms 层 - 有机体组件
export { default as ButtonGroup } from './organisms/ButtonGroup.vue'

// 类型定义
export interface ButtonProps {
    /** 按钮类型 */
    type?: 'button' | 'submit' | 'reset'
    /** 按钮变体 */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
    /** 按钮尺寸 */
    size?: 'small' | 'medium' | 'large'
    /** 是否禁用 */
    disabled?: boolean
    /** 是否加载中 */
    loading?: boolean
    /** 是否块级元素 */
    block?: boolean
}

export interface IconButtonProps extends ButtonProps {
    /** 按钮文本 */
    text?: string
    /** 前置图标组件 */
    prefixIcon?: any
    /** 后置图标组件 */
    suffixIcon?: any
    /** 加载状态文本 */
    loadingText?: string
}

export interface ButtonConfig {
    /** 唯一标识 */
    key?: string | number
    /** 按钮文本 */
    text: string
    /** 按钮变体 */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
    /** 按钮尺寸 */
    size?: 'small' | 'medium' | 'large'
    /** 是否禁用 */
    disabled?: boolean
    /** 是否加载中 */
    loading?: boolean
    /** 按钮类型 */
    type?: 'button' | 'submit' | 'reset'
    /** 前置图标 */
    prefixIcon?: any
    /** 后置图标 */
    suffixIcon?: any
    /** 点击回调 */
    onClick?: (event: MouseEvent) => void
}

export interface ButtonGroupProps {
    /** 按钮配置数组 */
    buttons: ButtonConfig[]
    /** 按钮组方向 */
    direction?: 'horizontal' | 'vertical'
    /** 按钮间距 */
    spacing?: 'none' | 'small' | 'medium' | 'large'
    /** 默认按钮变体 */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
    /** 默认按钮尺寸 */
    size?: 'small' | 'medium' | 'large'
    /** 是否整体禁用 */
    disabled?: boolean
    /** 默认按钮类型 */
    type?: 'button' | 'submit' | 'reset'
    /** 是否紧凑模式 */
    compact?: boolean
}
