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
if (
    firecrawl?.type === 'external' &&
    !process.env.FIRECRAWL_API_KEY &&
    !process.env.FIRECRAWL_API_URL
) {
    console.warn(
        '[mcp-gateway] firecrawl: 未检测到 FIRECRAWL_API_KEY 或 FIRECRAWL_API_URL。请在 shell 中 export，或在仓库根 `.env` / `packages/mcp-gateway/.env` 中配置，否则 MCP 初始化会失败。'
    )
}

const server = createGatewayHttpServer(services)

server.listen(port, host, () => {
    console.log(
        `MCP Gateway listening on ${host}:${port} (routes: /<service>/mcp)`
    )
})
