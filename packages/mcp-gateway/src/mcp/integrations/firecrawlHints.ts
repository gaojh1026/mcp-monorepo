/**
 * @fileoverview firecrawl 服务启动时的环境提示（与具体业务配置相关，与入口解耦）
 * @module mcp-gateway/mcp/integrations/firecrawlHints
 */

import type { McpService } from '../services.js'

/**
 * 若注册了外部 firecrawl 且未启用「每客户端密钥」模式，又缺少云端 API 环境变量，则打印配置提示。
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
