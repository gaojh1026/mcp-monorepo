/**
 * MCP 欢迎语工具
 *
 * 这是一个示例 MCP 工具，演示如何基于 MCP Framework 创建工具。
 * 工具接收用户名称和风格参数，返回不同风格的欢迎语。
 */

import { MCPTool } from 'mcp-framework'
import { z } from 'zod'

const inputSchema = z.object({
    name: z.string().trim().min(1).max(30).default('朋友').describe('Name of the user.'),
    style: z
        .enum(['warm', 'formal'])
        .default('warm')
        .describe('Tone style for the welcome message.')
})

/**
 * 欢迎语工具类
 *
 * 继承自 MCPTool，提供一个简单的欢迎语生成功能。
 * 工具名称：welcome_message
 */
export class WelcomeMessageTool extends MCPTool<typeof inputSchema> {
    name = 'welcome_message'
    description = 'Return a welcome message in different styles.'
    schema = inputSchema

    /**
     * 执行欢迎语生成
     *
     * @param input - 包含 name 和 style 的输入参数
     * @returns 包含 message 和 style 的欢迎语结果
     */
    async execute(input: z.infer<typeof inputSchema>) {
        const message =
            input.style === 'formal'
                ? `欢迎你，${input.name}。愿你今天灵感充沛、诸事顺遂。`
                : `嗨，${input.name}！欢迎来到诗词与灵感的小天地，祝你今天心情超棒！`

        return {
            message,
            style: input.style
        }
    }
}