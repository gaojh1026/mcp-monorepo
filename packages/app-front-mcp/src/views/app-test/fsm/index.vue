<template>
    <div class="fsm-container">
        <Fsm01></Fsm01>
        <!-- <Fsm02></Fsm02> -->
        <!-- <Fsm01Error></Fsm01Error> -->
        <!-- <Fsm0201></Fsm0201> -->
        <!-- <Fsm03></Fsm03> -->
        <!-- <Fsm04></Fsm04> -->
        <!-- <Fsm05></Fsm05> -->
        <!-- <Fsm06></Fsm06> -->
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Fsm01 from './components/fsm-01.vue'
import Fsm02 from './components/fsm-02.vue'
import Fsm01Error from './components/fsm-01-error.vue'
import Fsm0201 from './components/fsm-02-01.vue'
import Fsm03 from './components/fsm-03.vue'
import Fsm04 from './components/fsm-04.vue'
import Fsm05 from './components/fsm-05.vue'
import Fsm06 from './components/fsm-06.vue'

const fsmContainer = ref(null)

const init = () => {
    console.log('init')
}
</script>

<style scoped>
.fsm-container {
    width: 100%;
    height: 100%;
}
</style>
