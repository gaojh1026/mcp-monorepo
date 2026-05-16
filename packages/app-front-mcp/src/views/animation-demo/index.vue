<template>
    <div>
        <AnimationBtn :disabled="disabled" :loading="disabled" @click="btnClick"></AnimationBtn>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import AnimationBtn from './animation-btn.vue'

const disabled = ref(false)

const btnClick = () => {
    disabled.value = true

    setTimeout(() => {
        disabled.value = false
    }, 3000)
}
</script>

<style lang="less" scoped></style>
