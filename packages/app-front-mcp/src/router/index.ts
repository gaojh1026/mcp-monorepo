import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import McpServiceView from '../views/mcp/McpServiceView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/mcp-services'
        },
        {
            path: '/home',
            name: 'home',
            component: HomeView,
            meta: { requiresAuth: true }
        },
        {
            path: '/mcp-services',
            name: 'mcp-services',
            component: McpServiceView,
            meta: { requiresAuth: true }
        }
    ]
})

router.beforeEach((to, from, next) => {
    next()
})

export default router
