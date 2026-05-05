/**
 * @fileoverview firecrawl 服务启动时的环境提示（与具体业务配置相关，与入口解耦）
 * @module mcp-gateway/mcp/integrations/firecrawlHints
 */

import type { McpService } from '../services.js'

/**
 * Firecrawl 外部服务启动后的配置提示：
 * - `CLOUD_SERVICE=true`：提示必须走请求头鉴权，避免误以为 `FIRECRAWL_API_KEY` 会生效。
 * - 非上述模式且缺少 `FIRECRAWL_API_KEY` / `FIRECRAWL_API_URL`：提示补全环境变量或改为按请求鉴权。
 *
 * @param services - 已加载的服务表
 */
export const warnIfFirecrawlApiConfigMissing = (
    services: Map<string, McpService>
) => {
    const firecrawl = services.get('firecrawl')
    const firecrawlUsesPerClientApiKey =
        firecrawl?.type === 'external' &&
        String(firecrawl.spawn.env?.CLOUD_SERVICE ?? '').toLowerCase() ===
            'true'
    if (firecrawl?.type === 'external' && firecrawlUsesPerClientApiKey) {
        console.warn(
            '[mcp-gateway] firecrawl: 已启用 CLOUD_SERVICE=true（按请求鉴权）。经网关连接时，MCP 客户端必须在每条请求中携带 x-firecrawl-api-key 或 x-api-key（或 Bearer）；仅配置子进程环境变量 FIRECRAWL_API_KEY 不会用于 HTTP 鉴权。若希望使用 .env 中的 FIRECRAWL_API_KEY，请从 firecrawl.spawn.env 中移除 CLOUD_SERVICE。'
        )
    }
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
}
