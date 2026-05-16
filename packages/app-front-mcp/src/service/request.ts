import axios, { type AxiosResponse, type AxiosError } from 'axios'
import router from '../router'

const request = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000
})

/**
 * 处理响应错误
 * @param error 响应错误
 */
async function handleResponseError(error: AxiosError) {
    if (error.response) {
        const { status } = error.response
        if (status === 403) throw new Error('没有权限访问该资源')
        if (status >= 500) throw new Error('服务器错误')
    }
    return Promise.reject(error)
}

// ====================== 拦截器 =====================

// 请求拦截器
request.interceptors.request.use(config => {
    return config
})

// 响应拦截器
request.interceptors.response.use(
    (res: AxiosResponse) => {
        return res.data
    },
    (err: AxiosError) => handleResponseError(err)
)

export default request
