import type { McpService } from './types'

export const mcpServices: McpService[] = [
    {
        id: 'gateway',
        name: 'MCP Gateway',
        description: 'Gateway service for MCP protocol routing and management',
        version: '0.1.0',
        status: 'stopped',
        repository: 'mcp-gateway'
    },
    {
        id: 'oauth2',
        name: 'MCP OAuth2',
        description: 'OAuth2 authentication provider for MCP services',
        version: '1.0.0',
        status: 'stopped',
        repository: 'mcp-oauth2'
    },
    {
        id: 'oauth',
        name: 'MCP OAuth',
        description: 'OAuth authentication provider for MCP services',
        version: '1.0.0',
        status: 'stopped',
        repository: 'mcp-oauth'
    },
    {
        id: 'probe-kit',
        name: 'MCP Probe Kit',
        description: 'Diagnostic and probing tools for MCP services',
        version: '1.0.0',
        status: 'stopped',
        repository: 'mcp-probe-kit'
    },
    {
        id: 'brightdata',
        name: 'MCP Brightdata',
        description: 'Brightdata web data collection and scraping tools',
        version: '1.0.0',
        status: 'stopped',
        repository: 'mcp-brightdata',
        author: 'Brightdata'
    },
    {
        id: 'borderless-ui',
        name: 'MCP Borderless UI',
        description: 'UI component registry and management system',
        version: '1.0.0',
        status: 'stopped',
        repository: 'mcp-borderless-ui'
    },
    {
        id: 'firecrawl',
        name: 'MCP Firecrawl',
        description: 'Web search, scrape and interaction tools',
        version: '3.14.1',
        status: 'stopped',
        repository: 'mcp-firecrawl',
        author: 'Firecrawl'
    },
    {
        id: 'context7',
        name: 'MCP Context7',
        description: 'Documentation tools and SDKs for context management',
        version: '1.0.0',
        status: 'stopped',
        repository: 'mcp-context7',
        author: 'Upstash'
    },
    {
        id: 'playwright',
        name: 'MCP Playwright',
        description: 'Browser automation and testing tools',
        version: '0.0.71',
        status: 'stopped',
        repository: 'mcp-playwright',
        author: 'Microsoft'
    },
    {
        id: 'poem',
        name: 'MCP Poem',
        description: 'Poetry generation and analysis tools',
        version: '1.0.0',
        status: 'stopped',
        repository: 'mcp-poem'
    }
]