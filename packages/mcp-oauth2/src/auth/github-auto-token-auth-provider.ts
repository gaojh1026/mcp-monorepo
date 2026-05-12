import type { IncomingMessage } from 'node:http'
import type { AuthProvider, AuthResult } from 'mcp-framework'
import { fetchGitHubUser } from '../lib/github-user.js'
import { getAvailableToken, getStoredToken, saveToken } from '../lib/token-store.js'
import { requestDeviceCode, pollForToken } from '../lib/github-device-code.js'

const clientId = (process.env.GITHUB_CLIENT_ID ?? '').trim()

/**
 * MCP HTTP 入口鉴权：
 * 1. 如果请求包含 Authorization: Bearer <token>，使用该 token
 * 2. 否则尝试使用已保存的自动 token
 * 
 * 这个 Provider 支持"静默认证"：如果用户已经通过 github_device_login 授权，
 * MCP 可以自动使用保存的 token，无需每次手动传入
 */
export class GitHubAutoTokenAuthProvider implements AuthProvider {
    async authenticate(req: IncomingMessage): Promise<AuthResult | false> {
        const raw = req.headers.authorization
        
        let token: string | null = null

        // 1. 优先使用请求中传入的 Bearer token
        if (raw && typeof raw === 'string' && raw.startsWith('Bearer ')) {
            token = raw.slice('Bearer '.length).trim()
        }
        
        // 2. 如果没有传入 token，尝试使用自动保存的 token
        if (!token && clientId) {
            token = await getAvailableToken()
        }

        if (!token) {
            return false
        }

        // 验证 token
        const ghUser = await fetchGitHubUser(token)
        if (!ghUser) {
            // token 无效，清除保存的 token
            return false
        }

        return {
            data: {
                token,
                user: {
                    id: ghUser.id,
                    login: ghUser.login,
                    name: ghUser.name,
                    avatar_url: ghUser.avatar_url
                }
            }
        }
    }

    getAuthError(): { status: number; message: string } {
        return {
            status: 401,
            message: '需要 GitHub OAuth 认证。请调用 github_device_login 完成授权，或使用 Authorization: Bearer <token> 传入 access token。'
        }
    }
}
