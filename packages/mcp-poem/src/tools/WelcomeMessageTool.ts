import { MCPTool } from 'mcp-framework'
import { z } from 'zod'

const inputSchema = z.object({
    name: z.string().trim().min(1).max(30).default('朋友').describe('Name of the user.'),
    style: z
        .enum(['warm', 'formal'])
        .default('warm')
        .describe('Tone style for the welcome message.')
})

export class WelcomeMessageTool extends MCPTool<typeof inputSchema> {
    name = 'welcome_message'
    description = 'Return a welcome message in different styles.'
    schema = inputSchema

    /**
     * 生成欢迎语。
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
