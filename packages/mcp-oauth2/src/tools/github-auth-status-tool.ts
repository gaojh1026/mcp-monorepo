import { MCPTool } from 'mcp-framework'
import { z } from 'zod'
import { getStoredToken } from '../lib/token-store.js'
import { fetchGitHubUser } from '../lib/github-user.js'

const emptySchema = z.object({}).passthrough()

/**
 * 检查 GitHub OAuth 认证状态
 * 查看当前是否已登录，返回用户信息
 */
export class GitHubAuthStatusTool extends MCPTool<typeof emptySchema> {
    name = 'github_auth_status'
    description = '检查 GitHub OAuth 认证状态，返回当前登录用户信息（如已登录）或提示未登录'
    schema = emptySchema

    async execute(_input: z.infer<typeof emptySchema>) {
        const stored = getStoredToken()

        if (!stored?.access_token) {
            return {
                authenticated: false as const,
                message: '未登录 GitHub，请先调用 github_device_login 进行授权'
            }
        }

        // 验证 token 是否有效
        const user = await fetchGitHubUser(stored.access_token)

        if (!user) {
            return {
                authenticated: false as const,
                message: 'Token 已失效，请重新调用 github_device_login 进行授权',
                token_expired: true
            }
        }

        return {
            authenticated: true as const,
            user: {
                id: user.id,
                login: user.login,
                name: user.name,
                avatar_url: user.avatar_url
            },
            message: `已登录为 ${user.login}`
        }
    }
}
