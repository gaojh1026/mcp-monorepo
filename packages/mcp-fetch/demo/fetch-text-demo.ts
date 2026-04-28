import { MCPClient } from 'mcp-framework'

async function main() {
    const client = new MCPClient({
        serverUrl: 'http://localhost:8787/mcp'
    })

    try {
        const result = await client.callTool('fetch_text', {
            url: 'https://httpbin.org/html',
            timeoutMs: 10000,
            maxChars: 2000
        })

        console.log('=== fetch_text Demo Result ===')
        console.log('Status:', result.status)
        console.log('OK:', result.ok)
        console.log('Content-Type:', result.contentType)
        console.log('Text (first 500 chars):', result.text?.substring(0, 500) + '...')
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await client.close()
    }
}

main().catch(console.error)