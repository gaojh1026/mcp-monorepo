import { MCPClient } from 'mcp-framework'

async function main() {
    const client = new MCPClient({
        serverUrl: 'http://localhost:8787/mcp'
    })

    try {
        const result = await client.callTool('fetch_json', {
            url: 'https://httpbin.org/json',
            timeoutMs: 10000,
            maxKeys: 50
        })

        console.log('=== fetch_json Demo Result ===')
        console.log('Status:', result.status)
        console.log('OK:', result.ok)
        console.log('Content-Type:', result.contentType)
        console.log('Total Keys:', result.totalKeys)
        console.log('Data:', JSON.stringify(result.data, null, 2))
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await client.close()
    }
}

main().catch(console.error)