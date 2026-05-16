# Atomic Design 按钮组件系统

基于 Atomic Design 思维构建的按钮组件库，模仿 ant-design-vue 组件库的设计思想。

## 目录结构

```
components/
├── atoms/           # 原子层 - 最基础的组件
│   ├── BaseButton.vue    # 基础按钮组件
│   ├── StarIcon.vue      # 星星图标组件
│   └── CheckIcon.vue     # 检查图标组件
├── molecules/       # 分子层 - 由原子组合而成
│   └── IconButton.vue    # 带图标的按钮组件
├── organisms/       # 有机体层 - 由分子组合而成
│   └── ButtonGroup.vue   # 按钮组组件
├── tokens/          # Design Token 系统
│   ├── colors.ts         # 颜色 Token
│   ├── theme.ts          # 主题管理
│   └── index.ts          # Token 导出
└── index.ts         # 组件导出文件
```

## Atomic Design 层次说明

### 1. Atoms（原子层）

- **BaseButton**: 最基础的按钮组件，提供所有基础功能
    - 支持多种变体：primary、secondary、danger、ghost、link
    - 支持多种尺寸：small、medium、large
    - 支持多种状态：disabled、loading、block
    - 完整的样式系统和交互效果

### 2. Molecules（分子层）

- **IconButton**: 在 BaseButton 基础上增加图标功能
    - 支持前置图标和后置图标
    - 支持加载状态的自定义文本
    - 保持与 BaseButton 相同的 API 接口

### 3. Organisms（有机体层）

- **ButtonGroup**: 将多个按钮组合成一个功能组
    - 支持水平和垂直布局
    - 支持不同的间距设置
    - 支持紧凑模式
    - 提供统一的点击事件处理

## 设计特点

### 1. 层次化设计

- 每个层次都有明确的职责
- 上层组件基于下层组件构建
- 保持 API 的一致性和可扩展性

### 2. 组合优于继承

- 通过组合的方式构建复杂组件
- 每个组件都可以独立使用
- 支持灵活的自定义和扩展

### 3. 类型安全

- 完整的 TypeScript 类型定义
- 清晰的 Props 接口
- 良好的开发体验

### 4. 样式系统

- 基于 CSS 变量的主题系统
- 响应式设计
- 无障碍访问支持

## 使用示例

```vue
<template>
    <!-- 基础按钮 -->
    <BaseButton variant="primary" size="medium"> 点击我 </BaseButton>

    <!-- 带图标按钮 -->
    <IconButton text="收藏" :prefix-icon="StarIcon" variant="primary" />

    <!-- 按钮组 -->
    <ButtonGroup :buttons="buttonConfigs" @button-click="handleClick" />
</template>
```

## Design Token 系统

### 颜色 Token

类似 ant-design-vue 的 token 系统，所有颜色都通过 CSS 变量动态管理：

```css
/* 主色系 */
--atomic-primary-color
--atomic-primary-color-hover
--atomic-primary-color-active
--atomic-primary-bg
--atomic-primary-border

/* 次要色系 */
--atomic-secondary-color
--atomic-secondary-color-hover
...

/* 危险色系、幽灵色系、链接色系 */
```

### 支持的主题

1. **默认主题** (default) - 蓝色系，类似 Ant Design 默认主题
2. **绿色主题** (green) - 绿色系
3. **紫色主题** (purple) - 紫色系
4. **橙红色主题** (orange) - 橙红色系

### 使用方式

```typescript
import { initTheme, setTheme } from './components/tokens'

// 初始化主题
initTheme()

// 切换主题
setTheme('green')
```

## 核心优势

### 1. Design Token 模式

- 所有颜色通过 CSS 变量管理
- 支持动态主题切换
- 类似 ant-design-vue 的 token 系统
- 易于扩展和维护

### 2. Atomic Design 思维

- 层次化设计，职责清晰
- 组件可独立使用
- 组合优于继承
- 高度可扩展

### 3. 类型安全

- 完整的 TypeScript 支持
- 清晰的类型定义
- 良好的开发体验

## 扩展思路

1. **Templates 层**: 可以创建页面模板组件
2. **Pages 层**: 可以创建完整的页面组件
3. **更多 Token**: 可以扩展间距、圆角、阴影等 Token
4. **动画系统**: 可以添加更丰富的动画效果
5. **国际化**: 可以添加多语言支持
6. **暗色模式**: 可以添加暗色主题

这个实现展示了如何基于 Atomic Design 思维和 Design Token 模式构建一个可扩展、可维护的组件系统。
