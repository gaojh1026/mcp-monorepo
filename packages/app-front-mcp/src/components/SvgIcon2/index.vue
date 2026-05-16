<template>
    <svg :class="iconClass" aria-hidden="true">
        <use :xlink:href="iconName" :fill="color"></use>
    </svg>
</template>

<script setup>
// 定义属性
import { computed } from 'vue'

const props = defineProps({
    // 图标名,必填
    icon: {
        type: String,
        required: true
    },
    // 图标class
    iconClass: {
        type: String,
        default: 'icon' //默认值
    },
    // 图标颜色
    color: {
        type: String,
        default: ''
    }
})
// 图标拼接 #
const iconName = computed(() => {
    return `#${props.icon}`
})
</script>
