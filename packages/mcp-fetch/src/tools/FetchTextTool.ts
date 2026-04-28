import { MCPTool } from 'mcp-framework'
import { z } from 'zod'

const inputSchema = z.object({
    url: z.string().url().describe('The URL to fetch (GET).'),
    timeoutMs: z
        .number()
        .int()
        .min(100)
        .max(30000)
        .default(10000)
        .describe('Request timeout in milliseconds.'),
    maxChars: z
        .number()
        .int()
        .min(1_000)
        .max(200_000)
        .default(50_000)
        .describe('Maximum number of characters to return.')
})

export class FetchTextTool extends MCPTool<typeof inputSchema> {
    name = 'fetch_text'
    description = 'Fetch a URL and return response body as plain text (truncated).'
    schema = inputSchema

    async execute(input: z.infer<typeof inputSchema>) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), input.timeoutMs)

        try {
            const res = await fetch(input.url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'user-agent': '@mcp/fetch'
                }
            })

            const text = await res.text()
            const truncated = text.length > input.maxChars ? `${text.slice(0, input.maxChars)}\n...[truncated]` : text

            return {
                status: res.status,
                ok: res.ok,
                contentType: res.headers.get('content-type'),
                text: truncated
            }
        } catch (error) {
            return {
                status: 500,
                ok: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        } finally {
            clearTimeout(timer)
        }
    }
}