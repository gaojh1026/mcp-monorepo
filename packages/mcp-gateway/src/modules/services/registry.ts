/**
 * @fileoverview MCP 服务注册表：扫描本地包并合并外部服务配置
 * @module mcp-gateway/modules/services/registry
 */

import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import type { ChildProcess } from 'node:child_process'
import { MCPServer } from 'mcp-framework'

type PackageJson = {
    name?: string
    version?: string
}

/**
 * 本地 MCP 服务（同进程 MCPServer + 按 session 管理 transport）
 */
export type LocalMcpService = {
    type: 'local'
    id: string
    packageDir: string
    basePath: string
    server: MCPServer
    sessions: Map<string, { transport: any; sdkServer: any }>
}

/**
 * 外部 MCP（子进程 / 上游 HTTP，由网关探测与反代）
 */
export type ExternalMcpService = {
    type: 'external'
    id: string
    spawn: {
        command: string
        args: string[]
        cwd?: string
        env?: Record<string, string>
        shell?: boolean
    }
    upstream: {
        baseUrl: string
        path: string
    }
    ready: {
        type: 'tcp'
        host: string
        port: number
        timeoutMs: number
    }
    process?: ChildProcess
}

export type McpService = LocalMcpService | ExternalMcpService

const readJson = async <T>(path: string): Promise<T> =>
    JSON.parse(await readFile(path, 'utf8')) as T

const pickBasePath = (packageDir: string) => {
    const distTools = join(packageDir, 'dist', 'tools')
    const srcTools = join(packageDir, 'src', 'tools')
    if (existsSync(distTools)) return join(packageDir, 'dist')
    if (existsSync(srcTools)) return join(packageDir, 'src')
    if (process.env.MCP_GATEWAY_DEV === '1') return join(packageDir, 'src')
    return null
}

const resolveMaybeRelative = (baseDir: string, maybeRelativePath: string) => {
    if (isAbsolute(maybeRelativePath)) return maybeRelativePath
    return resolve(baseDir, maybeRelativePath)
}

type ExternalServicesConfigFile = {
    externalServices?: Record<
        string,
        {
            spawn: {
                command: string
                args: string[]
                cwd?: string
                env?: Record<string, string>
                shell?: boolean
            }
            upstream: {
                baseUrl: string
                path: string
            }
            ready: {
                type: 'tcp'
                host: string
                port: number
                timeoutMs: number
            }
        }
    >
}

/**
 * 加载所有 MCP 服务：`packages/mcp-*`（排除 gateway）+ `mcp-gateway.external-services.json`
 */
export const loadServices = async (
    repoRoot: string
): Promise<Map<string, McpService>> => {
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

        try {
            await (server as any).ensureInitialized?.()
        } catch (error) {
            console.error(`Failed to initialize service ${id}:`, error)
        }

        services.set(id, {
            type: 'local',
            id,
            packageDir,
            basePath,
            server,
            sessions: new Map()
        })
    }

    const externalConfigPath = resolve(
        repoRoot,
        'packages',
        'mcp-gateway',
        'mcp-gateway.external-services.json'
    )
    const configDir = resolve(repoRoot, 'packages', 'mcp-gateway')
    try {
        const externalConfig =
            await readJson<ExternalServicesConfigFile>(externalConfigPath)
        const externalServices = externalConfig.externalServices
        if (externalServices) {
            for (const [id, cfg] of Object.entries(externalServices)) {
                const spawnCwd = cfg.spawn.cwd
                    ? resolveMaybeRelative(configDir, cfg.spawn.cwd)
                    : undefined
                if (services.has(id)) {
                    console.warn(
                        `[mcp-gateway] external service '${id}' overrides existing local service`
                    )
                }
                services.set(id, {
                    type: 'external',
                    id,
                    spawn: {
                        command: cfg.spawn.command,
                        args: cfg.spawn.args ?? [],
                        cwd: spawnCwd,
                        env: cfg.spawn.env ?? {},
                        shell: cfg.spawn.shell ?? false
                    },
                    upstream: {
                        baseUrl: cfg.upstream.baseUrl,
                        path: cfg.upstream.path
                    },
                    ready: {
                        type: 'tcp',
                        host: cfg.ready.host,
                        port: cfg.ready.port,
                        timeoutMs: cfg.ready.timeoutMs
                    }
                })
            }
        }
    } catch (err: any) {
        if (err?.code !== 'ENOENT') {
            console.error(
                `[mcp-gateway] Failed to load external services config:`,
                err
            )
        }
    }

    return services
}
