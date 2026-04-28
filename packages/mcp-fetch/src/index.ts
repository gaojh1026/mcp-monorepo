import { MCPServer } from 'mcp-framework'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '0.0.0.0'
const endpoint = process.env.MCP_ENDPOINT ?? '/mcp'
const basePath = fileURLToPath(new URL('.', import.meta.url))

const server = new MCPServer({
    name: '@mcp/fetch',
    version: '0.1.0',
    basePath,
    transport: {
        type: 'http-stream',
        options: {
            host,
            port,
            endpoint
        }
    }
})

await server.start()

console.log(`@mcp/fetch server running on http://${host}:${port}${endpoint}`)
console.log('Tools are auto-loaded from tools/ directory.')

const shutdown = async () => {
    console.log('Shutting down @mcp/fetch server...')
    await server.stop()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
