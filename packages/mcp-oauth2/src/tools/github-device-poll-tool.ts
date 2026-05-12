import { MCPTool } from 'mcp-framework'
import { z } from 'zod'
import { pollForToken } from '../lib/github-device-code.js'
import { saveToken } from '../lib/token-store.js'

const clientId = (process.env.GITHUB_CLIENT_ID ?? '').trim()

const inputSchema = z.object({
    device_code: z.string().describe('从 github_device_login 获取的设备代码'),
    poll_interval: z.number().optional().describe('轮询间隔（秒），默认使用服务器返回的值'),
    max_wait: z.number().optional().describe('最大等待时间（秒），默认 300')
})

/**
 * 轮询等待 GitHub Device Code 授权完成
 * 在调用 github_device_login 后使用此工具等待授权
 */
export class GitHubDevicePollTool extends MCPTool<typeof inputSchema> {
    name = 'github_device_poll'
    description = `等待 GitHub Device Code 授权完成。使用步骤：
1. 先调用 github_device_login 获取设备代码
2. 调用此工具并传入 device_code
3. 在浏览器中完成 GitHub 授权
4. 授权成功后 token 自动保存

返回的 token 可用于后续的 API 调用。`
    schema = inputSchema

    async execute(input: z.infer<typeof inputSchema>) {
        if (!clientId) {
            return {
                success: false as const,
                error: '未设置 GITHUB_CLIENT_ID 环境变量'
            }
        }

        const { device_code, poll_interval = 5 } = input

        try {
            const result = await pollForToken(
                clientId,
                device_code,
                poll_interval
            )

            if ('error' in result) {
                return {
                    success: false as const,
                    error: result.error_description ?? result.error
                }
            }

            // 保存 token
            saveToken({
                access_token: result.access_token,
                token_type: result.token_type,
                scope: result.scope
            })

            return {
                success: true as const,
                message: 'GitHub 授权成功！Token 已保存，可直接调用其他工具。',
                token_type: result.token_type,
                scope: result.scope,
                token_saved: true
            }
        } catch (e) {
            return {
                success: false as const,
                error: e instanceof Error ? e.message : String(e)
            }
        }
    }
}
