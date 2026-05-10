import type { IncomingMessage } from 'node:http'
import type { AuthProvider, AuthResult } from 'mcp-framework'
import { fetchGitHubUser } from '../lib/github-user.js'

/**
 * MCP HTTP 入口鉴权：要求 `Authorization: Bearer <github_oauth_access_token>`，
 * 通过 GitHub `GET /user` 校验 token；成功后将 `token` 与 `user` 写入请求上下文。
 */
export class GitHubAccessTokenAuthProvider implements AuthProvider {
    async authenticate(req: IncomingMessage): Promise<AuthResult | false> {
        const raw = req.headers.authorization
        if (!raw || typeof raw !== 'string' || !raw.startsWith('Bearer ')) {
            return false
        }
        const token = raw.slice('Bearer '.length).trim()
        if (!token) {
            return false
        }
        const ghUser = await fetchGitHubUser(token)
        if (!ghUser) {
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
            message:
                '需要有效的 GitHub OAuth access token：Authorization: Bearer <token>'
        }
    }
}
