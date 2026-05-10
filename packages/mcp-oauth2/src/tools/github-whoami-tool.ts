import { MCPTool, getRequestContext } from 'mcp-framework'
import { z } from 'zod'

/** 无业务入参；`passthrough` 避免部分宿主附带额外字段导致校验失败 */
const emptySchema = z.object({}).passthrough()

/**
 * 返回当前 MCP 请求上下文中由 {@link GitHubAccessTokenAuthProvider} 写入的 GitHub 用户摘要。
 */
export class GitHubWhoAmITool extends MCPTool<typeof emptySchema> {
    name = 'github_whoami'
    description =
        '返回当前请求关联的 GitHub 登录身份（依赖入口 Bearer 与 GitHub /user 校验）。'
    schema = emptySchema

    /**
     * @returns 当前上下文的 `user.login` 等字段
     */
    async execute(_input: z.infer<typeof emptySchema>) {
        const ctx = getRequestContext()
        const user = ctx?.user as
            | { login?: string; id?: number; name?: string | null }
            | undefined
        if (!user?.login) {
            return {
                authenticated: false as const,
                hint: '未找到 GitHub 用户上下文，请使用 Authorization: Bearer <oauth_token> 连接 MCP。'
            }
        }
        return {
            authenticated: true as const,
            login: user.login,
            id: user.id,
            name: user.name ?? null
        }
    }
}
