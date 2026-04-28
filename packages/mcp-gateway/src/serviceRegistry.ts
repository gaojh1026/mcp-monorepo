import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { MCPServer } from 'mcp-framework'

type PackageJson = {
    name?: string
    version?: string
}

export type McpService = {
    id: string
    packageDir: string
    basePath: string
    server: MCPServer
    sessions: Map<string, { transport: any; sdkServer: any }>
}

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T

const pickBasePath = (packageDir: string) => {
    const distTools = join(packageDir, 'dist', 'tools')
    if (existsSync(distTools)) return join(packageDir, 'dist')
    if (process.env.MCP_GATEWAY_DEV === '1') return join(packageDir, 'src')
    return null
}

export const loadServices = async (repoRoot: string): Promise<Map<string, McpService>> => {
    const packagesDir = resolve(repoRoot, 'packages')
    const entries = await readdir(packagesDir, { withFileTypes: true })

    const services = new Map<string, McpService>()

    for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (!entry.name.startsWith('mcp-')) continue
        if (entry.name === 'mcp-gateway') continue

        const id = entry.name.slice('mcp-'.length)
        const packageDir = join(packagesDir, entry.name)
        const pkg = await readJson<PackageJson>(join(packageDir, 'package.json'))

        const basePath = pickBasePath(packageDir)
        if (!basePath) {
            continue
        }
        const server = new MCPServer({
            name: pkg.name ?? `mcp-${id}`,
            version: pkg.version ?? '0.0.0',
            basePath,
            logging: true
        })

        // Preload tools/prompts/resources once so routing is fast.
        await (server as any).ensureInitialized?.()

        services.set(id, { id, packageDir, basePath, server, sessions: new Map() })
    }

    return services
}
