import { MCPTool } from 'mcp-framework'
import { z } from 'zod'
import { requestDeviceCode } from '../lib/github-device-code.js'
import { getStoredToken } from '../lib/token-store.js'

const clientId = (process.env.GITHUB_CLIENT_ID ?? '').trim()

const emptySchema = z.object({}).passthrough()

/**
 * GitHub Device Code 登录工具
 * 使用 GitHub 官方推荐的 Device Flow 完成 OAuth 认证
 * 
 * 使用方式：
 * 1. 调用此工具获取用户代码和验证链接
 * 2. 在终端显示登录信息
 * 3. 用户在浏览器中访问验证链接并输入代码
 * 4. 认证完成后，token 自动保存
 */
export class GitHubDeviceLoginTool extends MCPTool<typeof emptySchema> {
    name = 'github_device_login'
    description = `使用 GitHub Device Code Flow 完成 OAuth 认证。使用步骤：
1. 调用此工具获取用户代码和验证链接
2. 在浏览器中打开验证链接 https://github.com/login/device
3. 输入显示的用户代码
4. 授权后 token 自动保存，之后即可直接调用 github_whoami 等工具

需要环境变量 GITHUB_CLIENT_ID。`
    schema = emptySchema

    async execute(_input: z.infer<typeof emptySchema>) {
        if (!clientId) {
            return {
                success: false as const,
                error: '未设置 GITHUB_CLIENT_ID 环境变量'
            }
        }

        try {
            // 检查是否已有有效 token
            const existingToken = getStoredToken()
            if (existingToken?.access_token) {
                return {
                    success: true as const,
                    already_authenticated: true,
                    message: '已存在有效的 GitHub token，无需重新登录'
                }
            }

            // 请求设备代码
            const deviceCode = await requestDeviceCode(clientId)

            // 返回登录信息（轮询逻辑在 auth provider 中处理）
            return {
                success: true as const,
                user_code: deviceCode.user_code,
                verification_uri: deviceCode.verification_uri,
                expires_in: deviceCode.expires_in,
                message: `请在浏览器中打开 ${deviceCode.verification_uri} 并输入代码: ${deviceCode.user_code}`,
                device_code: deviceCode.device_code,
                poll_interval: deviceCode.interval
            }
        } catch (e) {
            return {
                success: false as const,
                error: e instanceof Error ? e.message : String(e)
            }
        }
    }
}
