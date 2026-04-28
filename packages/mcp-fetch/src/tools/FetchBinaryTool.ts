import { MCPTool } from 'mcp-framework'
import { z } from 'zod'

const inputSchema = z.object({
    url: z.string().url().describe('The URL to fetch (GET).'),
    timeoutMs: z
        .number()
        .int()
        .min(100)
        .max(60000)
        .default(30000)
        .describe('Request timeout in milliseconds.'),
    maxBytes: z
        .number()
        .int()
        .min(1000)
        .max(5 * 1024 * 1024)
        .default(1 * 1024 * 1024)
        .describe('Maximum number of bytes to return (max 5MB).')
})

export class FetchBinaryTool extends MCPTool<typeof inputSchema> {
    name = 'fetch_binary'
    description = 'Fetch a URL and return response body as base64-encoded binary data.'
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

            const contentType = res.headers.get('content-type')
            const contentLength = parseInt(res.headers.get('content-length') || '0')

            const blob = await res.blob()
            const bytes = await blob.arrayBuffer()
            const actualBytes = bytes.byteLength

            let truncated = false
            let data: ArrayBuffer
            if (actualBytes > input.maxBytes) {
                data = bytes.slice(0, input.maxBytes)
                truncated = true
            } else {
                data = bytes
            }

            const base64 = Buffer.from(data).toString('base64')

            return {
                status: res.status,
                ok: res.ok,
                contentType,
                contentLength,
                bytesReturned: data.byteLength,
                truncated,
                data: base64
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