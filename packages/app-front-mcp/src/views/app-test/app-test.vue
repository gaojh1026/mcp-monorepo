<template>
    {{ themeConfig }}
    <ThemeConfigProvider :theme="themeConfig" :locale="locale">
        <div class="atomic-design-demo">
            <div class="demo-header">
                <h1>Atomic Design 按钮组件系统演示</h1>
                <p>基于 Atomic Design 思维构建的按钮组件库</p>

                <!-- 主题切换器 -->
                <div class="theme-selector">
                    <h3>主题切换 (Design Token 模式)</h3>
                    <div class="theme-buttons">
                        <button
                            v-for="theme in availableThemes"
                            :key="theme.name"
                            :class="['theme-button', { active: currentTheme === theme.name }]"
                            :style="{ '--theme-color': theme.color }"
                            @click="switchTheme(theme.name)"
                        >
                            {{ theme.label }}
                        </button>
                    </div>
                    <div class="custom-theme-row">
                        <label class="color-label">自定义主色：</label>
                        <input
                            type="color"
                            v-model="customBaseColor"
                            @input="onCustomColorChange"
                        />
                        <button
                            class="theme-button"
                            :class="{ active: isCustom }"
                            @click="enableCustomTheme"
                        >
                            使用自定义
                        </button>
                        <button class="theme-button" v-if="isCustom" @click="resetToPreset">
                            返回预设
                        </button>
                    </div>
                    <p class="theme-info">
                        当前主题: <strong>{{ isCustom ? 'custom' : currentTheme }}</strong>
                    </p>
                </div>
            </div>

            <!-- Atoms 层演示 -->
            <section class="demo-section">
                <h2>Atoms 层 - 基础按钮组件</h2>
                <div class="demo-grid">
                    <div class="demo-item">
                        <h3>变体演示</h3>
                        <div class="button-row">
                            <BaseButton variant="primary">主要按钮</BaseButton>
                            <BaseButton variant="secondary">次要按钮</BaseButton>
                            <BaseButton variant="danger">危险按钮</BaseButton>
                            <BaseButton variant="ghost">幽灵按钮</BaseButton>
                            <BaseButton variant="link">链接按钮</BaseButton>
                        </div>
                    </div>

                    <div class="demo-item">
                        <h3>尺寸演示</h3>
                        <div class="button-row">
                            <BaseButton size="small">小按钮</BaseButton>
                            <BaseButton size="medium">中按钮</BaseButton>
                            <BaseButton size="large">大按钮</BaseButton>
                        </div>
                    </div>

                    <div class="demo-item">
                        <h3>状态演示</h3>
                        <div class="button-row">
                            <BaseButton>正常状态</BaseButton>
                            <BaseButton disabled>禁用状态</BaseButton>
                            <BaseButton loading>加载状态</BaseButton>
                            <BaseButton block>块级按钮</BaseButton>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Molecules 层演示 -->
            <section class="demo-section">
                <h2>Molecules 层 - 图标按钮组件</h2>
                <div class="demo-grid">
                    <div class="demo-item">
                        <h3>带图标按钮</h3>
                        <div class="button-row">
                            <IconButton text="收藏" :prefix-icon="StarIcon" />
                            <IconButton text="确认" :suffix-icon="CheckIcon" />
                            <IconButton
                                text="收藏"
                                :prefix-icon="StarIcon"
                                :suffix-icon="CheckIcon"
                            />
                        </div>
                    </div>

                    <div class="demo-item">
                        <h3>加载状态</h3>
                        <div class="button-row">
                            <IconButton text="保存中" loading loading-text="保存中..." />
                            <IconButton
                                text="提交中"
                                loading
                                loading-text="提交中..."
                                variant="secondary"
                            />
                        </div>
                    </div>

                    <div class="demo-item">
                        <h3>不同尺寸</h3>
                        <div class="button-row">
                            <IconButton text="小按钮" :prefix-icon="StarIcon" size="small" />
                            <IconButton text="中按钮" :prefix-icon="StarIcon" size="medium" />
                            <IconButton text="大按钮" :prefix-icon="StarIcon" size="large" />
                        </div>
                    </div>
                </div>
            </section>

            <!-- Organisms 层演示 -->
            <section class="demo-section">
                <h2>Organisms 层 - 按钮组组件</h2>
                <div class="demo-grid">
                    <div class="demo-item">
                        <h3>水平按钮组</h3>
                        <ButtonGroup
                            :buttons="horizontalButtons"
                            @button-click="handleButtonClick"
                        />
                    </div>

                    <div class="demo-item">
                        <h3>垂直按钮组</h3>
                        <ButtonGroup
                            :buttons="verticalButtons"
                            direction="vertical"
                            @button-click="handleButtonClick"
                        />
                    </div>

                    <div class="demo-item">
                        <h3>紧凑模式</h3>
                        <ButtonGroup
                            :buttons="compactButtons"
                            compact
                            @button-click="handleButtonClick"
                        />
                    </div>

                    <div class="demo-item">
                        <h3>不同间距</h3>
                        <div class="spacing-demo">
                            <div>
                                <h4>无间距</h4>
                                <ButtonGroup :buttons="spacingButtons" spacing="none" />
                            </div>
                            <div>
                                <h4>小间距</h4>
                                <ButtonGroup :buttons="spacingButtons" spacing="small" />
                            </div>
                            <div>
                                <h4>中间距</h4>
                                <ButtonGroup :buttons="spacingButtons" spacing="medium" />
                            </div>
                            <div>
                                <h4>大间距</h4>
                                <ButtonGroup :buttons="spacingButtons" spacing="large" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 组合使用演示 -->
            <section class="demo-section">
                <h2>组合使用演示</h2>
                <div class="demo-grid">
                    <div class="demo-item">
                        <h3>表单操作按钮组</h3>
                        <ButtonGroup :buttons="formButtons" @button-click="handleButtonClick" />
                    </div>

                    <div class="demo-item">
                        <h3>工具栏按钮组</h3>
                        <ButtonGroup
                            :buttons="toolbarButtons"
                            compact
                            @button-click="handleButtonClick"
                        />
                    </div>
                </div>
            </section>
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { BaseButton, IconButton, ButtonGroup, type ButtonConfig } from './components'
import StarIcon from './components/atoms/StarIcon.vue'
import CheckIcon from './components/atoms/CheckIcon.vue'
import {
    initTheme,
    setTheme,
    type ThemeName,
    applyCustomTheme,
    generateThemeFromBaseColor
} from './components/tokens'
import ThemeConfigProvider from './components/ThemeConfigProvider.vue'

/**
 * 水平按钮组配置
 */
const horizontalButtons = ref<ButtonConfig[]>([
    {
        key: 'save',
        text: '保存',
        variant: 'primary',
        onClick: () => console.log('保存')
    },
    {
        key: 'cancel',
        text: '取消',
        variant: 'secondary',
        onClick: () => console.log('取消')
    },
    {
        key: 'delete',
        text: '删除',
        variant: 'danger',
        onClick: () => console.log('删除')
    }
])

/**
 * 垂直按钮组配置
 */
const verticalButtons = ref<ButtonConfig[]>([
    {
        key: 'create',
        text: '创建',
        variant: 'primary',
        onClick: () => console.log('创建')
    },
    {
        key: 'edit',
        text: '编辑',
        variant: 'secondary',
        onClick: () => console.log('编辑')
    },
    {
        key: 'view',
        text: '查看',
        variant: 'ghost',
        onClick: () => console.log('查看')
    }
])

/**
 * 紧凑模式按钮组配置
 */
const compactButtons = ref<ButtonConfig[]>([
    {
        key: 'bold',
        text: 'B',
        variant: 'secondary',
        onClick: () => console.log('粗体')
    },
    {
        key: 'italic',
        text: 'I',
        variant: 'secondary',
        onClick: () => console.log('斜体')
    },
    {
        key: 'underline',
        text: 'U',
        variant: 'secondary',
        onClick: () => console.log('下划线')
    }
])

/**
 * 间距演示按钮组配置
 */
const spacingButtons = ref<ButtonConfig[]>([
    {
        key: 'btn1',
        text: '按钮1',
        variant: 'primary',
        onClick: () => console.log('按钮1')
    },
    {
        key: 'btn2',
        text: '按钮2',
        variant: 'secondary',
        onClick: () => console.log('按钮2')
    },
    {
        key: 'btn3',
        text: '按钮3',
        variant: 'danger',
        onClick: () => console.log('按钮3')
    }
])

/**
 * 表单操作按钮组配置
 */
const formButtons = ref<ButtonConfig[]>([
    {
        key: 'submit',
        text: '提交',
        variant: 'primary',
        type: 'submit',
        onClick: () => console.log('提交表单')
    },
    {
        key: 'reset',
        text: '重置',
        variant: 'secondary',
        type: 'reset',
        onClick: () => console.log('重置表单')
    },
    {
        key: 'cancel',
        text: '取消',
        variant: 'ghost',
        onClick: () => console.log('取消操作')
    }
])

/**
 * 工具栏按钮组配置
 */
const toolbarButtons = ref<ButtonConfig[]>([
    {
        key: 'new',
        text: '新建',
        prefixIcon: StarIcon,
        variant: 'primary',
        onClick: () => console.log('新建')
    },
    {
        key: 'open',
        text: '打开',
        variant: 'secondary',
        onClick: () => console.log('打开')
    },
    {
        key: 'save',
        text: '保存',
        variant: 'secondary',
        onClick: () => console.log('保存')
    },
    {
        key: 'export',
        text: '导出',
        suffixIcon: CheckIcon,
        variant: 'secondary',
        onClick: () => console.log('导出')
    }
])

/**
 * 处理按钮组点击事件
 */
const handleButtonClick = (button: ButtonConfig, index: number, event: MouseEvent) => {
    console.log('按钮组点击:', { button, index, event })
}

/**
 * 主题管理
 */
const currentTheme = ref<ThemeName>('default')
const isCustom = ref(false)
const customBaseColor = ref<string>('#1890ff')

const availableThemes = [
    { name: 'default' as ThemeName, label: '默认 (蓝色)', color: '#1890ff' },
    { name: 'green' as ThemeName, label: '绿色', color: '#52c41a' },
    { name: 'purple' as ThemeName, label: '紫色', color: '#722ed1' },
    { name: 'orange' as ThemeName, label: '橙红色', color: '#fa8c16' }
]

/**
 * 切换主题
 */
const switchTheme = (themeName: ThemeName) => {
    currentTheme.value = themeName
    setTheme(themeName)
    isCustom.value = false
    localStorage.setItem('themeMode', 'preset')
    localStorage.setItem('currentTheme', themeName)
}

/**
 * 初始化主题
 */
const enableCustomTheme = () => {
    isCustom.value = true
    const tokens = generateThemeFromBaseColor(customBaseColor.value)
    applyCustomTheme(tokens)
    localStorage.setItem('themeMode', 'custom')
    localStorage.setItem('customBase', customBaseColor.value)
}

const onCustomColorChange = () => {
    if (!isCustom.value) return
    const tokens = generateThemeFromBaseColor(customBaseColor.value)
    applyCustomTheme(tokens)
    localStorage.setItem('customBase', customBaseColor.value)
}

const resetToPreset = () => {
    isCustom.value = false
    const saved = (localStorage.getItem('currentTheme') as ThemeName) || 'default'
    currentTheme.value = saved
    setTheme(saved)
    localStorage.setItem('themeMode', 'preset')
}

onMounted(() => {
    const mode = localStorage.getItem('themeMode')
    if (mode === 'custom') {
        const savedBase = localStorage.getItem('customBase') || '#1890ff'
        customBaseColor.value = savedBase
        isCustom.value = true
        const tokens = generateThemeFromBaseColor(customBaseColor.value)
        applyCustomTheme(tokens)
    } else {
        const savedTheme = (localStorage.getItem('currentTheme') as ThemeName) || 'default'
        currentTheme.value = savedTheme
        initTheme()
        if (savedTheme !== 'default') setTheme(savedTheme)
    }
})

// 提供给本地 ThemeConfigProvider 的主题配置（形状与 AntD 类似）
const themeConfig = reactive({
    token: {
        colorPrimary: '#1677ff'
    }
})

const locale = { name: 'zh-CN' }
</script>

<style scoped>
.atomic-design-demo {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-header {
    text-align: center;
    margin-bottom: 48px;
}

.demo-header h1 {
    color: #1890ff;
    margin-bottom: 8px;
    font-size: 32px;
}

.demo-header p {
    color: #666;
    font-size: 16px;
}

/* 主题选择器样式 */
.theme-selector {
    margin-top: 32px;
    padding: 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-selector h3 {
    color: #ffffff;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 600;
}

.custom-theme-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 10px 0 0;
}

.color-label {
    color: #fff;
}

.theme-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.theme-button {
    padding: 10px 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.theme-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--theme-color);
    opacity: 0.1;
    transition: opacity 0.3s ease;
}

.theme-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-button:hover::before {
    opacity: 0.2;
}

.theme-button.active {
    background: var(--theme-color);
    color: #ffffff;
    border-color: var(--theme-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.theme-button.active::before {
    opacity: 0;
}

.theme-info {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    margin-top: 12px;
}

.theme-info strong {
    color: #ffffff;
    font-size: 16px;
}

.demo-section {
    margin-bottom: 48px;
}

.demo-section h2 {
    color: #333;
    border-bottom: 2px solid #1890ff;
    padding-bottom: 8px;
    margin-bottom: 24px;
    font-size: 24px;
}

.demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
}

.demo-item {
    background: #fafafa;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 20px;
}

.demo-item h3 {
    color: #333;
    margin-bottom: 16px;
    font-size: 18px;
}

.demo-item h4 {
    color: #666;
    margin-bottom: 8px;
    font-size: 14px;
}

.button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
}

.spacing-demo {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.spacing-demo > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .atomic-design-demo {
        padding: 16px;
    }

    .demo-grid {
        grid-template-columns: 1fr;
    }

    .button-row {
        flex-direction: column;
        align-items: stretch;
    }

    .button-row > * {
        width: 100%;
    }
}
</style>
