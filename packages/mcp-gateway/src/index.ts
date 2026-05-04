/**
 * @fileoverview MCP Gateway 入口：加载服务、拉起外部进程、监听 HTTP
 * @module mcp-gateway
 */

import { findRepoRoot, port, host } from './lib/runtime.js'
import { loadOptionalEnvFiles } from './lib/dotenv.js'
import { loadServices } from './modules/services/registry.js'
import { ensureExternalServicesStarted } from './modules/services/external.js'
import { createGatewayHttpServer } from './modules/gateway/httpServer.js'

const repoRoot = findRepoRoot(process.cwd())
loadOptionalEnvFiles(repoRoot)
const services = await loadServices(repoRoot)
await ensureExternalServicesStarted(services)

const firecrawl = services.get('firecrawl')
const firecrawlUsesPerClientApiKey =
    firecrawl?.type === 'external' &&
    String(firecrawl.spawn.env?.CLOUD_SERVICE ?? '').toLowerCase() === 'true'
if (
    firecrawl?.type === 'external' &&
    !firecrawlUsesPerClientApiKey &&
    !process.env.FIRECRAWL_API_KEY &&
    !process.env.FIRECRAWL_API_URL
) {
    console.warn(
        '[mcp-gateway] firecrawl: 未检测到 FIRECRAWL_API_KEY 或 FIRECRAWL_API_URL（且子进程未设置 CLOUD_SERVICE=true）。请在 shell / .env 中配置密钥，或在 mcp-gateway.external-services.json 的 firecrawl.spawn.env 中设置 CLOUD_SERVICE 为 true，以改为由客户端请求头传入各自密钥。'
    )
}

const server = createGatewayHttpServer(services)

server.listen(port, host, () => {
    console.log(
        `MCP Gateway listening on ${host}:${port} (routes: /<service>/mcp)`
    )
})
