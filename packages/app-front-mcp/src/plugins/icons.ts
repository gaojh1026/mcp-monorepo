import { OhVueIcon, addIcons } from 'oh-vue-icons'
import { FaFlag, RiZhihuFill, BiRecordCircle } from 'oh-vue-icons/icons'

import type { App } from 'vue'

export default (app: App) => {
    addIcons(FaFlag, RiZhihuFill, BiRecordCircle)
    app.component('v-icon', OhVueIcon)
}
