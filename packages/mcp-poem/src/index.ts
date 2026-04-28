import { MCPServer } from 'mcp-framework'
import { RandomPoemTool } from './tools/RandomPoemTool.js'

const port = Number(process.env.PORT ?? 8788)
const host = process.env.HOST ?? '0.0.0.0'
const endpoint = process.env.MCP_ENDPOINT ?? '/mcp'

const server = new MCPServer({
    name: '@mcp/poem',
    version: '0.1.0',
    transport: {
        type: 'http-stream',
        options: {
            host,
            port,
            endpoint
        }
    }
})

server.addTool(RandomPoemTool)

await server.start()

console.log(`@mcp/poem server running on http://${host}:${port}${endpoint}`)
console.log('Available tools: random_poem')

const shutdown = async () => {
    console.log('Shutting down @mcp/poem server...')
    await server.stop()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
