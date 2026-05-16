import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'virtual:svg-icons-register'
import SvgIcon from '@/components/SvgIcon/index.vue'
import { tokenSyncManager } from './utils/token-sync'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import components from './plugins/components'
import icons from './plugins/icons'
import './styles/index.less'

// 初始化跨标签页token同步
tokenSyncManager.init()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 设置auth store的跨标签页监听器
// const authStore = useAuthStore()
// authStore.initAuth()
// const cleanupListeners = authStore.setupCrossTabListeners()

const app = createApp(App)

// 应用卸载时清理监听器
// app.config.globalProperties.$cleanup = cleanupListeners

app.use(pinia)
app.use(router)
app.use(Antd)
app.use(components)
app.use(icons)

app.mount('#app')
