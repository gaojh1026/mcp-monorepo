/**
 * @fileoverview 网关侧 MCP 服务：注册表（本地包 + 外部 JSON）与外部进程（TCP 就绪、spawn、HTTP 反代）。
 *
 * **注册表**职责概览：
 * 1. **本地服务**：遍历 monorepo 下 `packages/mcp-*`（跳过 `mcp-gateway`），根据 `package.json`
 *    与源码/构建目录创建 `MCPServer`，供网关同进程托管。
 * 2. **外部服务**：读取 `mcp-gateway.external-services.json`，将子进程启动参数、上游 HTTP
 *    与就绪探测（TCP）合并为 `ExternalMcpService`，与本地条目共用同一 `Map` 的 `id` 键。
 *
 * 外部配置若与本地 `id` 冲突，以外部为准并打警告日志。
 *
 * **外部 MCP**：TCP 就绪、可选 spawn、HTTP(S) 反代。
 * @module mcp-gateway/mcp/services
 */

import { spawn } from 'node:child_process'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { ChildProcess } from 'node:child_process'
import { MCPServer } from 'mcp-framework'
import {
    readJsonFile,
    resolveMaybeRelative,
    isTcpPortOpen,
    waitForTcpReady,
    MCP_GATEWAY_CORS_ALLOW_HEADERS,
    MCP_GATEWAY_CORS_EXPOSE_HEADERS
} from '../utils/helpers.js'

/** 扫描 `package.json` 时仅需的字段，用于构造 `MCPServer` 的元数据。 */
type PackageJson = {
    name?: string
    version?: string
}

/**
 * 本地 MCP 服务：工具逻辑在网关进程内通过 `mcp-framework` 的 `MCPServer` 加载。
 *
 * - `basePath`：指向含 `tools` 的目录（优先 `dist`，否则 `src`；开发模式下可强制 `src`）。
 * - `sessions`：每个客户端会话对应一套 transport / sdk server 实例，由网关在连接时写入。
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
 * 外部 MCP：实际进程在网格外或由网关 `spawn` 拉起；网关通过 `ready` 做 TCP 就绪等待，
 * 再通过 `upstream` 将请求反代到子进程暴露的 HTTP 端点。
 *
 * `process` 在运行期由网关赋值，用于生命周期管理（非配置来源）。
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

/** 网关可识别的单条服务：要么是同进程本地包，要么是配置驱动的外部进程。 */
export type McpService = LocalMcpService | ExternalMcpService

/**
 * 为 `MCPServer` 选择 `basePath`：必须指向包含 `tools` 子目录的构建根或源码根。
 *
 * 优先级：`dist/tools` → `src/tools`；若均不存在且 `MCP_GATEWAY_DEV=1` 则回退 `src`，
 * 否则返回 `null`，该包会被跳过（不注册为服务）。
 *
 * @param packageDir - 某个 `packages/mcp-*` 包的根目录。
 * @returns 可用的 base 目录，或无法推断时 `null`。
 */
const pickBasePath = (packageDir: string) => {
    const distTools = join(packageDir, 'dist', 'tools')
    const srcTools = join(packageDir, 'src', 'tools')
    if (existsSync(distTools)) return join(packageDir, 'dist')
    if (existsSync(srcTools)) return join(packageDir, 'src')
    if (process.env.MCP_GATEWAY_DEV === '1') return join(packageDir, 'src')
    return null
}

/**
 * `mcp-gateway.external-services.json` 的根结构；仅使用 `externalServices` 映射。
 * 键为服务 `id`（与 URL/路由中的 id 一致），值为 spawn / upstream / ready 三块配置。
 */
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
 * 加载仓库内全部 MCP 服务定义（本地包 + 外部 JSON），供网关在启动或刷新注册表时调用。
 *
 * @remarks
 * **阶段一（本地）**
 * - 路径：`resolve(repoRoot, 'packages')`。若该目录不存在，`readdir` 会向调用方抛错。
 * - 只处理**目录**项；名称须以 `mcp-` 开头且**不等于** `mcp-gateway`（网关自身不作为被托管 MCP）。
 * - `id` = 目录名去掉前缀 `mcp-`（例如 `mcp-poem` → `poem`）。
 * - 读取 `package.json` 的 `name` / `version`；`pickBasePath` 返回 `null` 时整包跳过（无 `dist/tools` 与 `src/tools` 等）。
 * - `MCPServer` 使用 `ensureInitialized?.()`（若框架提供）；**初始化异常只 `console.error`，仍会 `set` 本地服务**，避免单个包拖死整表。
 *
 * **阶段二（外部）**
 * - 固定读取 `packages/mcp-gateway/mcp-gateway.external-services.json`。
 * - `spawn.cwd` 若为相对路径，相对**网关包目录** `packages/mcp-gateway` 解析为绝对路径。
 * - 配置缺省：`args` 默认 `[]`，`env` 默认 `{}`，`shell` 默认 `false`。
 * - 与阶段一同 `id` 时：**后写覆盖**，即以外部条目为准，并 `console.warn` 提示覆盖本地。
 * - 文件不存在（`err.code === 'ENOENT'`）：不加载外部项、不打错误日志；**其他 I/O / JSON 错误**：`console.error` 后外部段为空，已注册的本地项仍返回。
 *
 * @param repoRoot - monorepo 根目录，其下应存在 `packages` 子目录。
 * @returns 新的 `Map<string, McpService>`，键为服务 `id`；未对 Map 做深拷贝，条目与运行期网关状态共享引用（如 `sessions`、`process`）。
 */
export const loadServices = async (
    repoRoot: string
): Promise<Map<string, McpService>> => {
    const packagesDir = resolve(repoRoot, 'packages')
    const entries = await readdir(packagesDir, { withFileTypes: true })

    const services = new Map<string, McpService>()

    /** 阶段一：注册 `packages/mcp-*` 本地包（排除 mcp-gateway）。 */
    for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (!entry.name.startsWith('mcp-')) continue
        if (entry.name === 'mcp-gateway') continue

        const id = entry.name.slice('mcp-'.length)
        const packageDir = join(packagesDir, entry.name)
        const pkg = await readJsonFile<PackageJson>(
            join(packageDir, 'package.json')
        )

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

    /** 阶段二：合并 `mcp-gateway.external-services.json`，可覆盖同 id 的本地项。 */
    const externalConfigPath = resolve(
        repoRoot,
        'packages',
        'mcp-gateway',
        'mcp-gateway.external-services.json'
    )
    const configDir = resolve(repoRoot, 'packages', 'mcp-gateway')
    try {
        const externalConfig =
            await readJsonFile<ExternalServicesConfigFile>(externalConfigPath)
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

/**
 * 为所有 `external` 服务 spawn（若端口未开）并等待 TCP ready
 */
export const ensureExternalServicesStarted = async (
    services: Map<string, McpService>
) => {
    const externalServices = Array.from(services.values()).filter(
        (s): s is ExternalMcpService => s.type === 'external'
    )

    const started = await Promise.all(
        externalServices.map(async service => {
            const portOpen = await isTcpPortOpen(
                service.ready.host,
                service.ready.port,
                300
            )
            if (!portOpen) {
                const env = { ...process.env, ...(service.spawn.env ?? {}) }
                const child = spawn(service.spawn.command, service.spawn.args, {
                    cwd: service.spawn.cwd,
                    env,
                    shell: service.spawn.shell ?? false,
                    stdio: 'inherit'
                })

                service.process = child

                child.once('exit', (code, signal) => {
                    console.warn(
                        `[mcp-gateway] external service '${service.id}' exited (code=${code}, signal=${signal})`
                    )
                })
            }

            await waitForTcpReady(
                service.ready.host,
                service.ready.port,
                service.ready.timeoutMs
            )
        })
    )

    void started
}

/**
 * 将请求反代到外部服务 upstream（含流式响应）
 */
export const proxyExternalRequest = async (
    req: IncomingMessage,
    res: ServerResponse,
    service: ExternalMcpService,
    url: URL
) => {
    const upstreamPath = service.upstream.path.startsWith('/')
        ? service.upstream.path
        : `/${service.upstream.path}`
    const targetUrl = new URL(upstreamPath, service.upstream.baseUrl)
    targetUrl.search = url.search

    const proxyHeaders: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue
        proxyHeaders[k] = Array.isArray(v) ? v[0] : v
    }
    proxyHeaders.host = targetUrl.host
    proxyHeaders['x-forwarded-host'] = targetUrl.host
    proxyHeaders['x-forwarded-port'] = targetUrl.port
    proxyHeaders['x-forwarded-proto'] = targetUrl.protocol.replace(':', '')

    const isHttps = targetUrl.protocol === 'https:'
    const requester = isHttps ? httpsRequest : httpRequest

    await new Promise<void>((resolve, reject) => {
        const proxyReq = requester(
            {
                method: req.method,
                protocol: targetUrl.protocol,
                hostname: targetUrl.hostname,
                port: targetUrl.port,
                path: targetUrl.pathname + targetUrl.search,
                headers: proxyHeaders
            },
            proxyRes => {
                const corsHeaders: Record<string, string> = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods':
                        'GET, POST, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': MCP_GATEWAY_CORS_ALLOW_HEADERS,
                    'Access-Control-Expose-Headers': MCP_GATEWAY_CORS_EXPOSE_HEADERS
                }

                if (!res.headersSent) {
                    res.writeHead(
                        proxyRes.statusCode ?? 502,
                        Object.assign({}, proxyRes.headers as any, corsHeaders)
                    )
                }
                proxyRes.pipe(res)

                proxyRes.on('end', () => resolve())
            }
        )

        proxyReq.on('error', err => reject(err))
        req.on('aborted', () => proxyReq.destroy())

        req.pipe(proxyReq)
    }).catch(err => {
        if (res.headersSent) return
        res.writeHead(502).end(`Bad Gateway: ${(err as Error).message}`)
    })
}
