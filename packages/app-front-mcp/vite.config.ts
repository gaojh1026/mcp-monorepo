import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'path'
import { viteSingleFile } from 'vite-plugin-singlefile'

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:8998'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueJsx(),
        vueDevTools(),
        viteSingleFile(),
        createSvgIconsPlugin({
            // 指定需要缓存的图标文件夹
            iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
            // 指定symbolId格式
            symbolId: 'icon-[dir]-[name]'

            /**
             * 自定义插入位置
             * @default: body-last
             */
            // inject?: 'body-last' | 'body-first'

            /**
             * custom dom id
             * @default: __svg__icons__dom__
             */
            // customDomId: '__svg__icons__dom__',
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@app/common': '../../common/index.ts',
            '@app/common/*': '../../common/*'
        }
    },

    server: {
        host: '0.0.0.0',
        port: 4000,
        proxy: {
            '/nestjs_api/': {
                target: devProxyTarget,
                changeOrigin: true,
                rewrite: path => path.replace(/^\/nestjs_api/, '')
            }
        }
    }
})
