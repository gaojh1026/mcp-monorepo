/** 处理token相关逻辑 */

// ================ 定义token相关类型 ================
// Token 存储的 key
const ACCESS_TOKEN_KEY = 'nest_sso_access_token' // 校验token
const REFRESH_TOKEN_KEY = 'nest_sso_refresh_token' // 刷新token

// token类型
export const TOKEN_TYPE = {
    ACCESS: 'access',
    REFRESH: 'refresh'
} as const
export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE]

// token类型与存储的 key 的映射
const tokensMap = {
    [TOKEN_TYPE.ACCESS]: ACCESS_TOKEN_KEY, // access token
    [TOKEN_TYPE.REFRESH]: REFRESH_TOKEN_KEY // refresh token
}

// ================ 定义token相关函数 ================

/**
 * 获取 token
 * @param {TokenType} type
 * @returns {string | null} token 或 null
 */
export const getToken = (type: TokenType = TOKEN_TYPE.ACCESS): string | null => {
    return localStorage.getItem(tokensMap[type])
}

/**
 * 设置 token
 * @param {TokenType} type
 * @param {string} token
 */
export const setToken = (type: TokenType, token: string): void => {
    localStorage.setItem(tokensMap[type], token)
}

/**
 * 清除 token
 * @param {TokenType} type
 */
export const clearToken = (type: TokenType = TOKEN_TYPE.ACCESS): void => {
    localStorage.removeItem(tokensMap[type])
}

// =====================业务函数=====================

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
export const isLoggedIn = (): boolean => {
    const token = getToken()
    return !!token && token.trim() !== ''
}

/**
 * 检查是否需要刷新 token
 * @returns {boolean} 是否需要刷新 token
 */
export const isNeedRefreshToken = (): boolean => {
    // 如果没有 access token，需要刷新
    if (!getToken(TOKEN_TYPE.ACCESS)) return true

    // 如果有 refresh token，可以尝试刷新
    if (getToken(TOKEN_TYPE.REFRESH)) return true

    return false
}

/**
 * 登录-保存token
 * @param {string} accessToken - access token
 * @param {string} refreshToken - refresh token
 */
export const loginTokens = (accessToken: string, refreshToken: string): void => {
    setToken(TOKEN_TYPE.ACCESS, accessToken)
    setToken(TOKEN_TYPE.REFRESH, refreshToken)
}

/**
 * 登出-清除token
 * @param {TokenType[]} types 清除的token类型
 */
export const logoutTokens = (
    types: TokenType[] = [TOKEN_TYPE.ACCESS, TOKEN_TYPE.REFRESH]
): void => {
    types.forEach(type => {
        clearToken(type)
    })
}

/**
 * 刷新 token（无感刷新）
 * @param {string} newAccessToken - 新的 access token
 * @param {string} newRefreshToken - 新的 refresh token（可选）
 */
export function refreshTokens(newAccessToken: string, newRefreshToken?: string): void {
    setToken(TOKEN_TYPE.ACCESS, newAccessToken)

    if (newRefreshToken) {
        setToken(TOKEN_TYPE.REFRESH, newRefreshToken)
    }
}
