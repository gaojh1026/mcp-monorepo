import SvgIcon from '@/components/SvgIcon/index.vue'
import * as AntDesignIcons from '@ant-design/icons-vue'
import type { App } from 'vue'

export default (app: App) => {
    app.component('SvgIcon', SvgIcon)

    // 注册所有 Ant Design 图标为全局组件
    Object.keys(AntDesignIcons).forEach(key => {
        app.component(key, (AntDesignIcons as any)[key])
    })
}
