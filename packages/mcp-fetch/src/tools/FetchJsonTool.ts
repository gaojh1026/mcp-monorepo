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
    maxKeys: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(100)
        .describe('Maximum number of keys to return in nested JSON.')
})

export class FetchJsonTool extends MCPTool<typeof inputSchema> {
    name = 'fetch_json'
    description = 'Fetch a URL and parse response body as JSON.'
    schema = inputSchema

    private limitKeys(obj: unknown, maxKeys: number, currentKeys: number = 0): { result: unknown; totalKeys: number } {
        if (currentKeys >= maxKeys) {
            return { result: '[truncated]', totalKeys: currentKeys }
        }

        if (typeof obj !== 'object' || obj === null) {
            return { result: obj, totalKeys: currentKeys }
        }

        if (Array.isArray(obj)) {
            const limited: unknown[] = []
            let keys = currentKeys
            for (const item of obj) {
                if (keys >= maxKeys) break
                const { result, totalKeys } = this.limitKeys(item, maxKeys, keys)
                limited.push(result)
                keys = totalKeys
            }
            return { result: limited, totalKeys: keys }
        }

        const limited: Record<string, unknown> = {}
        let keys = currentKeys
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            if (keys >= maxKeys) break
            const { result, totalKeys } = this.limitKeys(value, maxKeys, keys + 1)
            limited[key] = result
            keys = totalKeys
        }
        return { result: limited, totalKeys: keys }
    }

    async execute(input: z.infer<typeof inputSchema>) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), input.timeoutMs)

        try {
            const res = await fetch(input.url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'user-agent': '@mcp/fetch',
                    'accept': 'application/json'
                }
            })

            if (!res.ok) {
                return {
                    status: res.status,
                    ok: false,
                    error: `HTTP error ${res.status}`
                }
            }

            const contentType = res.headers.get('content-type')
            if (!contentType?.includes('application/json')) {
                return {
                    status: res.status,
                    ok: true,
                    warning: 'Response is not JSON content type',
                    contentType
                }
            }

            const json = await res.json()
            const { result: limitedJson, totalKeys } = this.limitKeys(json, input.maxKeys)

            return {
                status: res.status,
                ok: true,
                contentType,
                data: limitedJson,
                totalKeys
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