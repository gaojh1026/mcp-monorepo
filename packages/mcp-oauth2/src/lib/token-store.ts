/**
 * GitHub OAuth Token 持久化管理器
 * 支持 Device Code Flow 获取的 token 存储和自动加载
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

export type StoredToken = {
    access_token: string
    token_type: string
    scope: string
    created_at: number
}

const TOKEN_DIR = join(homedir(), '.config', 'mcp-oauth2')
const TOKEN_FILE = join(TOKEN_DIR, 'github-token.json')

/**
 * 获取存储的 token（如果存在且未过期）
 */
export function getStoredToken(): StoredToken | null {
    try {
        if (!existsSync(TOKEN_FILE)) {
            return null
        }
        const content = readFileSync(TOKEN_FILE, 'utf-8')
        const token: StoredToken = JSON.parse(content)
        return token
    } catch {
        return null
    }
}

/**
 * 保存 token 到文件系统
 */
export function saveToken(token: Omit<StoredToken, 'created_at'>): void {
    try {
        mkdirSync(TOKEN_DIR, { recursive: true })
        const fullToken: StoredToken = {
            ...token,
            created_at: Date.now()
        }
        writeFileSync(TOKEN_FILE, JSON.stringify(fullToken, null, 2))
    } catch (e) {
        console.error('[token-store] 保存 token 失败:', e)
    }
}

/**
 * 清除存储的 token
 */
export function clearToken(): void {
    try {
        if (existsSync(TOKEN_FILE)) {
            const { unlinkSync } = require('node:fs')
            unlinkSync(TOKEN_FILE)
        }
    } catch (e) {
        console.error('[token-store] 清除 token 失败:', e)
    }
}

/**
 * 获取当前可用的 token（优先使用存储的 token）
 */
export async function getAvailableToken(): Promise<string | null> {
    const stored = getStoredToken()
    if (stored?.access_token) {
        // 验证 token 是否仍然有效
        const isValid = await validateToken(stored.access_token)
        if (isValid) {
            return stored.access_token
        }
    }
    return null
}

/**
 * 验证 token 是否有效
 */
async function validateToken(token: string): Promise<boolean> {
    try {
        const res = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        return res.ok
    } catch {
        return false
    }
}
