/**
 * 主题管理工具
 * 用于动态切换和管理主题颜色
 */

import { ref, reactive } from 'vue'
import { themes, type ThemeName, type ColorTokens } from './colors'

/**
 * 当前主题
 */
const currentTheme = ref<ThemeName>('default')

/**
 * 获取当前主题的颜色
 */
export const getCurrentThemeColors = (): ColorTokens => {
    return themes[currentTheme.value]
}

/**
 * 切换主题
 */
export const setTheme = (themeName: ThemeName) => {
    currentTheme.value = themeName
    // 将主题颜色应用到 CSS 变量
    applyThemeToCSS(themeName)
}

/**
 * 应用主题到 CSS 变量
 */
const applyTokensToCSS = (colors: ColorTokens) => {
    const root = document.documentElement
    root.style.setProperty('--atomic-primary-color', colors.primary.color)
    root.style.setProperty('--atomic-primary-color-hover', colors.primary.colorHover)
    root.style.setProperty('--atomic-primary-color-active', colors.primary.colorActive)
    root.style.setProperty('--atomic-primary-bg', colors.primary.bg)
    root.style.setProperty('--atomic-primary-border', colors.primary.border)
    root.style.setProperty('--atomic-primary-border-hover', colors.primary.borderHover)

    root.style.setProperty('--atomic-secondary-color', colors.secondary.color)
    root.style.setProperty('--atomic-secondary-color-hover', colors.secondary.colorHover)
    root.style.setProperty('--atomic-secondary-color-active', colors.secondary.colorActive)
    root.style.setProperty('--atomic-secondary-bg', colors.secondary.bg)
    root.style.setProperty('--atomic-secondary-border', colors.secondary.border)
    root.style.setProperty('--atomic-secondary-border-hover', colors.secondary.borderHover)

    root.style.setProperty('--atomic-danger-color', colors.danger.color)
    root.style.setProperty('--atomic-danger-color-hover', colors.danger.colorHover)
    root.style.setProperty('--atomic-danger-color-active', colors.danger.colorActive)
    root.style.setProperty('--atomic-danger-bg', colors.danger.bg)
    root.style.setProperty('--atomic-danger-border', colors.danger.border)
    root.style.setProperty('--atomic-danger-border-hover', colors.danger.borderHover)

    root.style.setProperty('--atomic-ghost-color', colors.ghost.color)
    root.style.setProperty('--atomic-ghost-color-hover', colors.ghost.colorHover)
    root.style.setProperty('--atomic-ghost-bg', colors.ghost.bg)
    root.style.setProperty('--atomic-ghost-bg-hover', colors.ghost.bgHover)
    root.style.setProperty('--atomic-ghost-border', colors.ghost.border)
    root.style.setProperty('--atomic-ghost-border-hover', colors.ghost.borderHover)

    root.style.setProperty('--atomic-link-color', colors.link.color)
    root.style.setProperty('--atomic-link-color-hover', colors.link.colorHover)
    root.style.setProperty('--atomic-link-color-active', colors.link.colorActive)
}

const applyThemeToCSS = (themeName: ThemeName) => {
    const colors = themes[themeName]
    applyTokensToCSS(colors)
}

/**
 * 获取当前主题名称
 */
export const getCurrentTheme = (): ThemeName => {
    return currentTheme.value
}

/**
 * 在应用启动时初始化主题
 */
export const initTheme = () => {
    applyThemeToCSS(currentTheme.value)
}

/**
 * 主题配置组合式函数
 */
export const useTheme = () => {
    const theme = reactive({
        current: currentTheme,
        set: setTheme,
        getColors: getCurrentThemeColors,
        themes: themes
    })

    return theme
}

// 导出所有可用主题名称
export { themes, type ThemeName, type ColorTokens }

/**
 * 将十六进制颜色转换为 HSL
 * @param hex 十六进制颜色，如 #1890ff
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const parsed = hex.replace('#', '')
    const bigint = parseInt(
        parsed.length === 3
            ? parsed
                  .split('')
                  .map(c => c + c)
                  .join('')
            : parsed,
        16
    )
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    const rNorm = r / 255
    const gNorm = g / 255
    const bNorm = b / 255
    const max = Math.max(rNorm, gNorm, bNorm)
    const min = Math.min(rNorm, gNorm, bNorm)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    const d = max - min
    if (d !== 0) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case rNorm:
                h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)
                break
            case gNorm:
                h = (bNorm - rNorm) / d + 2
                break
            case bNorm:
                h = (rNorm - gNorm) / d + 4
                break
        }
        h /= 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/**
 * 将 HSL 转为十六进制
 */
function hslToHex(h: number, s: number, l: number): string {
    s /= 100
    l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    const toHex = (x: number) => {
        const v = Math.round(255 * x).toString(16)
        return v.length === 1 ? '0' + v : v
    }
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

/**
 * 调整亮度
 * @param hex 基础颜色
 * @param deltaL 亮度变化（-100~100）
 */
function adjustLightness(hex: string, deltaL: number): string {
    const { h, s, l } = hexToHsl(hex)
    const nl = Math.max(0, Math.min(100, l + deltaL))
    return hslToHex(h, s, nl)
}

/**
 * 根据主色生成完整的 ColorTokens
 * @param base 主色（十六进制）
 */
export function generateThemeFromBaseColor(base: string): ColorTokens {
    const baseColor = base
    const hover = adjustLightness(baseColor, 10)
    const active = adjustLightness(baseColor, -12)
    const linkHover = adjustLightness(baseColor, 12)
    const linkActive = adjustLightness(baseColor, -15)

    console.log('baseColor---', baseColor)
    console.log('hover---', hover)
    console.log('active---', active)
    console.log('linkHover---', linkHover)
    console.log('linkActive---', linkActive)
    return {
        primary: {
            color: baseColor,
            colorHover: hover,
            colorActive: active,
            primary: baseColor,
            bg: baseColor,
            border: baseColor,
            borderHover: hover
        },
        secondary: {
            color: '#000000',
            colorHover: baseColor,
            colorActive: active,
            bg: '#ffffff',
            border: '#d9d9d9',
            borderHover: hover
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
            colorHover: baseColor,
            bg: 'transparent',
            bgHover: '#f5f5f5',
            border: '#d9d9d9',
            borderHover: hover
        },
        link: {
            color: baseColor,
            colorHover: linkHover,
            colorActive: linkActive
        }
    }
}

/**
 * 直接应用自定义 ColorTokens 到 CSS 变量
 */
export function applyCustomTheme(tokens: ColorTokens) {
    console.log('tokens---', tokens)
    applyTokensToCSS(tokens)
}
