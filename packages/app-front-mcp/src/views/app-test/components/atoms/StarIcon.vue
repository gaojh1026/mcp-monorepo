<template>
    <svg
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
            :fill="color"
        />
    </svg>
</template>

<script setup lang="ts">
/**
 * 星星图标组件
 */
interface Props {
    /** 图标尺寸 */
    size?: number
    /** 图标颜色 */
    color?: string
}

withDefaults(defineProps<Props>(), {
    size: 16,
    color: 'currentColor'
})
</script>
