/**
 * @fileoverview MCP Gateway 入口：加载服务、监听 HTTP；外部 MCP 在后台 spawn / 等待 TCP 就绪
 * @module mcp-gateway
 */
import { findRepoRoot, getPort, getHost, loadOptionalEnvFiles } from './utils/utils.js';
import { loadServices, ensureExternalServicesStarted } from './mcp/services.js';
import { createGatewayHttpServer } from './mcp/httpGateway.js';

// 查找仓库根目录并加载可选的 .env 文件
const repoRoot = findRepoRoot(process.cwd());

// 加载可选的 .env 文件
loadOptionalEnvFiles(repoRoot);

// 加载服务
const services = await loadServices(repoRoot);

// 创建绑定 `services` 的网关 HTTP 服务器
const server = createGatewayHttpServer(services);

/**
 * 外部 MCP（spawn + TCP 就绪）不在 listen 之前阻塞，否则 Docker/Nginx 探活会在超时内永远拿不到 `/health`；
 * 外部路由在就绪前可能返回 502，就绪日志见控制台。
 */
void ensureExternalServicesStarted(services).catch((error) => {
    console.error('[mcp-gateway] external services bootstrap failed:', error);
});

// 监听 HTTP 服务器
server.listen(getPort(), getHost(), () => {
    console.log(`✅ MCP Gateway listening on http://${getHost()}:${getPort()} (routes: /fe/<service>/mcp)`);
});
