import { MCPTool } from 'mcp-framework'
import { z } from 'zod'

const quotes = [
    { text: '千里之行，始于足下。', author: '老子' },
    { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
    { text: '天行健，君子以自强不息。', author: '《周易》' },
    { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
    { text: '纸上得来终觉浅，绝知此事要躬行。', author: '陆游' },
    { text: '知之者不如好之者，好之者不如乐之者。', author: '孔子' }
]

const inputSchema = z.object({
    count: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(1)
        .describe('Number of quotes to return (1-5).')
})

export class RandomQuoteTool extends MCPTool<typeof inputSchema> {
    name = 'random_quote'
    description = 'Return random famous Chinese quotes.'
    schema = inputSchema

    /**
     * 返回随机名言列表。
     */
    async execute(input: z.infer<typeof inputSchema>) {
        const shuffled = [...quotes].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, input.count)

        return {
            count: selected.length,
            quotes: selected
        }
    }
}
