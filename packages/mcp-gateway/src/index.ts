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
