import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'virtual:svg-icons-register'

import App from './App.vue'
import router from './router'
import components from './plugins/components'
import icons from './plugins/icons'
import './styles/index.less'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Antd)
app.use(components)
app.use(icons)

app.mount('#app')
