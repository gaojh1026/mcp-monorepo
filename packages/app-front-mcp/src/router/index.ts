import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth'
import HomeView from '../views/HomeView.vue'
import AppTest from '../views/app-test/index.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/home'
        },
        {
            path: '/home',
            name: 'home',
            component: HomeView,
            meta: { requiresAuth: true }
        },
        {
            path: '/sso-center',
            name: 'sso-center',
            component: () => import('../views/sso-center/index.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/app-register',
            name: 'app-register',
            component: () => import('../views/app-register/index.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/login-page',
            name: 'login-page',
            component: () => import('../views/login-page/index.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/github-callback',
            name: 'github-callback',
            component: () => import('../views/github-callback/index.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/h5-login',
            name: 'h5-login',
            component: () => import('../views/h5-login/index.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/file-upload',
            name: 'file-upload',
            component: () => import('../views/file-upload/index.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/app-llm',
            name: 'app-llm',
            component: () => import('../views/app-llm/index.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/app-webRtc',
            name: 'app-webRtc',
            component: () => import('../views/app-webRtc/index.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/app-test',
            name: 'app-test',
            component: AppTest,
            meta: { requiresAuth: false }
        },
        {
            path: '/fsm-test',
            name: 'fsm-test',
            component: () => import('../views/fsm-test/index.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/blank-test',
            name: 'blank-test',
            component: () => import('../views/blank-test/index.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/animation-demo',
            name: 'animation-demo',
            component: () => import('../views/animation-demo/index.vue'),
            meta: { requiresAuth: false }
        }
    ]
})

router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth) {
        if (!isLoggedIn()) {
            next({ name: 'login-page', query: to.query })
            return
        }
    }

    if (to.name === 'login-page' && isLoggedIn()) {
        next({ name: 'home', query: to.query })
        return
    }

    next()
})

export default router
