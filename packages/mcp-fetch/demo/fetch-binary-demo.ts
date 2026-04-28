import { MCPClient } from 'mcp-framework'
import { writeFileSync } from 'fs'

async function main() {
    const client = new MCPClient({
        serverUrl: 'http://localhost:8787/mcp'
    })

    try {
        const result = await client.callTool('fetch_binary', {
            url: 'https://httpbin.org/image/png',
            timeoutMs: 30000,
            maxBytes: 1024 * 1024
        })

        console.log('=== fetch_binary Demo Result ===')
        console.log('Status:', result.status)
        console.log('OK:', result.ok)
        console.log('Content-Type:', result.contentType)
        console.log('Content-Length:', result.contentLength)
        console.log('Bytes Returned:', result.bytesReturned)
        console.log('Truncated:', result.truncated)

        if (result.data) {
            const buffer = Buffer.from(result.data, 'base64')
            writeFileSync('./demo/output.png', buffer)
            console.log('Image saved to: demo/output.png')
        }
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await client.close()
    }
}

main().catch(console.error)