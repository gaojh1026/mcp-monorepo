/**
 * @fileoverview MCP Gateway 入口：加载服务、拉起外部进程、监听 HTTP
 * @module mcp-gateway
 */

import { findRepoRoot, port, host } from './lib/runtime.js'
import { loadServices } from './modules/services/registry.js'
import { ensureExternalServicesStarted } from './modules/services/external.js'
import { createGatewayHttpServer } from './modules/gateway/httpServer.js'

const repoRoot = findRepoRoot(process.cwd())
const services = await loadServices(repoRoot)
await ensureExternalServicesStarted(services)

const server = createGatewayHttpServer(services)

server.listen(port, host, () => {
    console.log(
        `MCP Gateway listening on ${host}:${port} (routes: /<service>/mcp)`
    )
})
