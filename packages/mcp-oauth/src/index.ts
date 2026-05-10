import { MCPServer } from 'mcp-framework'
import { WelcomeMessageTool } from './tools/WelcomeMessageTool.js'

const port = Number(process.env.PORT ?? 8788)
const host = process.env.HOST ?? '0.0.0.0'
const endpoint = process.env.MCP_ENDPOINT ?? '/mcp'

const server = new MCPServer({
    name: 'mcp-oauth',
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
server.addTool(WelcomeMessageTool)

await server.start()

console.log(`@mcp/poem server running on http://${host}:${port}${endpoint}`)
console.log('Available tools:  welcome_message')

const shutdown = async () => {
    console.log('Shutting down mcp-oauth server...')
    await server.stop()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
