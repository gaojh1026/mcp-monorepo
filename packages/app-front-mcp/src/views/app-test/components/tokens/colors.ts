/**
 * Design Token - 颜色系统
 * 类似 ant-design-vue 的 token 系统，用于统一管理设计变量
 */

/**
 * 基础颜色系统
 */
export interface ColorTokens {
    /** 主色系 */
    primary: {
        /** 主色 */
        color: string
        /** 主色 hover */
        colorHover: string
        /** 主色 active */
        colorActive: string
        /** 主色文本 */
        primary: string
        /** 主色背景 */
        bg: string
        /** 主色边框 */
        border: string
        /** 主色边框 hover */
        borderHover: string
    }
    /** 次要色系 */
    secondary: {
        color: string
        colorHover: string
        colorActive: string
        bg: string
        border: string
        borderHover: string
    }
    /** 危险色系 */
    danger: {
        color: string
        colorHover: string
        colorActive: string
        bg: string
        border: string
        borderHover: string
    }
    /** 幽灵色系 */
    ghost: {
        color: string
        colorHover: string
        bg: string
        bgHover: string
        border: string
        borderHover: string
    }
    /** 链接色系 */
    link: {
        color: string
        colorHover: string
        colorActive: string
    }
}

/**
 * 默认主题颜色（类似 Ant Design 蓝色）
 */
export const defaultThemeColors: ColorTokens = {
    primary: {
        color: '#1890ff',
        colorHover: '#40a9ff',
        colorActive: '#096dd9',
        bg: '#1890ff',
        border: '#1890ff',
        borderHover: '#40a9ff'
    },
    secondary: {
        color: '#000000',
        colorHover: '#40a9ff',
        colorActive: '#096dd9',
        bg: '#ffffff',
        border: '#d9d9d9',
        borderHover: '#40a9ff'
    },
    danger: {
        color: '#ff4d4f',
        colorHover: '#ff7875',
        colorActive: '#d9363e',
        bg: '#ff4d4f',
        border: '#ff4d4f',
        borderHover: '#ff7875'
    },
    ghost: {
        color: '#000000',
        colorHover: '#40a9ff',
        bg: 'transparent',
        bgHover: '#f5f5f5',
        border: '#d9d9d9',
        borderHover: '#40a9ff'
    },
    link: {
        color: '#1890ff',
        colorHover: '#40a9ff',
        colorActive: '#096dd9'
    }
}

/**
 * 绿色主题（类似 Ant Design Green）
 */
export const greenThemeColors: ColorTokens = {
    primary: {
        color: '#52c41a',
        colorHover: '#73d13d',
        colorActive: '#389e0d',
        bg: '#52c41a',
        border: '#52c41a',
        borderHover: '#73d13d'
    },
    secondary: {
        color: '#000000',
        colorHover: '#52c41a',
        colorActive: '#389e0d',
        bg: '#ffffff',
        border: '#d9d9d9',
        borderHover: '#52c41a'
    },
    danger: {
        color: '#ff4d4f',
        colorHover: '#ff7875',
        colorActive: '#d9363e',
        bg: '#ff4d4f',
        border: '#ff4d4f',
        borderHover: '#ff7875'
    },
    ghost: {
        color: '#000000',
        colorHover: '#52c41a',
        bg: 'transparent',
        bgHover: '#f5f5f5',
        border: '#d9d9d9',
        borderHover: '#52c41a'
    },
    link: {
        color: '#52c41a',
        colorHover: '#73d13d',
        colorActive: '#389e0d'
    }
}

/**
 * 紫色主题
 */
export const purpleThemeColors: ColorTokens = {
    primary: {
        color: '#722ed1',
        colorHover: '#9254de',
        colorActive: '#531dab',
        bg: '#722ed1',
        border: '#722ed1',
        borderHover: '#9254de'
    },
    secondary: {
        color: '#000000',
        colorHover: '#722ed1',
        colorActive: '#531dab',
        bg: '#ffffff',
        border: '#d9d9d9',
        borderHover: '#722ed1'
    },
    danger: {
        color: '#ff4d4f',
        colorHover: '#ff7875',
        colorActive: '#d9363e',
        bg: '#ff4d4f',
        border: '#ff4d4f',
        borderHover: '#ff7875'
    },
    ghost: {
        color: '#000000',
        colorHover: '#722ed1',
        bg: 'transparent',
        bgHover: '#f5f5f5',
        border: '#d9d9d9',
        borderHover: '#722ed1'
    },
    link: {
        color: '#722ed1',
        colorHover: '#9254de',
        colorActive: '#531dab'
    }
}

/**
 * 橙红色主题
 */
export const orangeThemeColors: ColorTokens = {
    primary: {
        color: '#fa8c16',
        colorHover: '#ffa940',
        colorActive: '#d46b08',
        bg: '#fa8c16',
        border: '#fa8c16',
        borderHover: '#ffa940'
    },
    secondary: {
        color: '#000000',
        colorHover: '#fa8c16',
        colorActive: '#d46b08',
        bg: '#ffffff',
        border: '#d9d9d9',
        borderHover: '#fa8c16'
    },
    danger: {
        color: '#ff4d4f',
        colorHover: '#ff7875',
        colorActive: '#d9363e',
        bg: '#ff4d4f',
        border: '#ff4d4f',
        borderHover: '#ff7875'
    },
    ghost: {
        color: '#000000',
        colorHover: '#fa8c16',
        bg: 'transparent',
        bgHover: '#f5f5f5',
        border: '#d9d9d9',
        borderHover: '#fa8c16'
    },
    link: {
        color: '#fa8c16',
        colorHover: '#ffa940',
        colorActive: '#d46b08'
    }
}

/**
 * 尺寸系统
 */
export interface SizeTokens {
    /** 字体大小 */
    fontSize: string
    /** 内边距 */
    padding: string
    /** 最小高度 */
    minHeight: string
    /** 边框圆角 */
    borderRadius: string
}

/**
 * 按钮尺寸 Token
 */
export const sizeTokens = {
    small: {
        fontSize: '12px',
        padding: '4px 8px',
        minHeight: '24px',
        borderRadius: '4px'
    } as SizeTokens,
    medium: {
        fontSize: '14px',
        padding: '8px 16px',
        minHeight: '32px',
        borderRadius: '6px'
    } as SizeTokens,
    large: {
        fontSize: '16px',
        padding: '12px 24px',
        minHeight: '40px',
        borderRadius: '8px'
    } as SizeTokens
}

/**
 * 间距系统
 */
export const spacingTokens = {
    none: '0',
    small: '4px',
    medium: '8px',
    large: '16px'
}

/**
 * 主题名称
 */
export type ThemeName = 'default' | 'green' | 'purple' | 'orange'

/**
 * 所有主题映射
 */
export const themes: Record<ThemeName, ColorTokens> = {
    default: defaultThemeColors,
    green: greenThemeColors,
    purple: purpleThemeColors,
    orange: orangeThemeColors
}
