/**
 * @fileoverview MCP Gateway 入口：加载服务、拉起外部进程、监听 HTTP
 * @module mcp-gateway
 */

import { findRepoRoot, port, host, loadOptionalEnvFiles } from './utils/env.js'
import { loadServices, ensureExternalServicesStarted } from './mcp/services.js'
import { createGatewayHttpServer } from './mcp/httpGateway.js'
import { warnIfFirecrawlApiConfigMissing } from './mcp/integrations/firecrawlHints.js'

// 查找仓库根目录并加载可选的 .env 文件
const repoRoot = findRepoRoot(process.cwd())

// 加载可选的 .env 文件
loadOptionalEnvFiles(repoRoot)

// 加载服务
const services = await loadServices(repoRoot)

// 确保外部服务已启动
await ensureExternalServicesStarted(services)

// 警告 Firecrawl API 配置缺失
warnIfFirecrawlApiConfigMissing(services)

// 创建绑定 `services` 的网关 HTTP 服务器
const server = createGatewayHttpServer(services)

// 监听 HTTP 服务器
server.listen(port, host, () => {
    console.log(
        `✅ MCP Gateway listening on ${host}:${port} (routes: /<service>/mcp)`
    )
})

/**
 * 优雅关闭：先停止接受新连接，再向本机拉起的外部 MCP 发 SIGTERM（与 PM2 `kill_timeout` 配合）。
 * @param signal - 收到的信号名，仅用于日志
 */
const shutdown = (signal: string) => {
    console.log(`[mcp-gateway] 收到 ${signal}，停止接受新连接…`)
    server.close(() => {
        for (const s of services.values()) {
            if (s.type === 'external' && s.process && !s.process.killed) {
                s.process.kill('SIGTERM')
            }
        }
        process.exit(0)
    })
    setTimeout(() => {
        console.error('[mcp-gateway] 关闭超时，强制退出')
        process.exit(1)
    }, 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
