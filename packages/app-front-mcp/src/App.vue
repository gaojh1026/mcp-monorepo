<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import svgTest from './views/svg-test.vue'

const authStore = useAuthStore()

onMounted(() => {
    // 初始化认证状态
    authStore.initAuth()
})
</script>

<template>
    <RouterView />
    <svgTest></svgTest>
</template>

<style scoped></style>
