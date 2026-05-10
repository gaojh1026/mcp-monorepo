/**
 * @fileoverview 调用 NestJS `oauth2/my-apps` 接口，使用当前 MCP 请求的 Bearer 转发鉴权。
 */

import { MCPTool } from 'mcp-framework'
import { z } from 'zod'
import { fetchWithMcpRequestAuthorization } from '../lib/upstream.js'

const DEFAULT_MY_APPS_URL = 'http://localhost:4000/nestjs_api/oauth2/my-apps'

const inputSchema = z.object({
    /** 可选；默认使用环境变量 `NEST_OAUTH2_MY_APPS_URL` 或本地 Nest 默认地址 */
    url: z.string().url().optional().describe('完整请求 URL，不传则使用默认或环境变量。')
})

/**
 * 拉取当前用户在 OAuth2 下的「我的应用」列表（GET，自动带 `Authorization: Bearer`）。
 */
export class OAuth2MyAppsTool extends MCPTool<typeof inputSchema> {
    name = 'oauth2_my_apps'
    description =
        'GET 请求 NestJS `oauth2/my-apps`，返回 JSON 或文本。需 MCP 客户端已配置与本服务一致的 Authorization: Bearer。'
    schema = inputSchema

    /**
     * 请求上游并解析响应体；失败时返回 `ok: false` 与错误信息（不记录 token）。
     */
    async execute(input: z.infer<typeof inputSchema>) {
        const targetUrl =
            input.url?.trim() ||
            process.env.NEST_OAUTH2_MY_APPS_URL?.trim() ||
            DEFAULT_MY_APPS_URL

        try {
            const res = await fetchWithMcpRequestAuthorization(targetUrl, { method: 'GET' })
            const text = await res.text()
            let data: unknown = text
            try {
                data = text ? JSON.parse(text) : null
            } catch {
                // 非 JSON 时保留原始字符串
            }
            return {
                ok: res.ok,
                status: res.status,
                url: targetUrl,
                data
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            return {
                ok: false,
                status: 0,
                url: targetUrl,
                error: message
            }
        }
    }
}
