import { MCPClient } from 'mcp-framework'

async function main() {
    const client = new MCPClient({
        serverUrl: 'http://localhost:8787/mcp'
    })

    try {
        const result = await client.callTool('random_poem', {
            count: 2
        })

        console.log('=== random_poem Demo Result ===')
        console.log('Total Poems:', result.count)
        console.log('')

        result.poems.forEach((poem: any, index: number) => {
            console.log(`--- Poem ${index + 1} ---`)
            console.log(`《${poem.title}》`)
            console.log(`${poem.dynasty}·${poem.author}`)
            console.log('')
            console.log(poem.content)
            console.log('')
        })
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await client.close()
    }
}

main().catch(console.error)