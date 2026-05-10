/**
 * MCP-OAuth 服务入口文件
 *
 * 该服务基于 MCP Framework 构建，提供 MCP 服务端点。
 * 支持：
 * - HTTP Stream 传输协议
 * - 入口鉴权：`Authorization: Bearer <token>`（由 {@link BearerIngressAuthProvider} 校验非空并写入上下文；token 真伪由上游如 Nest 校验）
 * - CORS 跨域配置
 * - 任务管理（任务队列、TTL、超时控制）
 */

import './load-env.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MCPServer, logger } from 'mcp-framework'
import { BearerIngressAuthProvider } from './lib/bearer.js'
import { OAuth2MyAppsTool } from './tools/oauth2MyAppsTool.js'
import { WelcomeMessageTool } from './tools/WelcomeMessageTool.js'
import { GitHubRepoTool } from './tools/githubRepoTool.js'
import { GreetingPrompt } from './tools/greetingPrompt.js'

// ========================================= 常量定义 =========================================

/** 当前文件的目录 */
const __dirname = dirname(fileURLToPath(import.meta.url))
/** 服务端口，默认 8788（与同仓库 mcp-poem 一致），可通过环境变量 PORT 配置 */
const port = Number(process.env.PORT ?? 8788)
/** 绑定地址，默认 0.0.0.0（本机所有网卡）。客户端请用 `http://127.0.0.1:PORT` 或 `localhost`，不要用 `0.0.0.0` 作为连接目标。 */
const host = process.env.HOST ?? '0.0.0.0'
/** MCP 端点路径，默认 /mcp，可通过环境变量 MCP_ENDPOINT 配置 */
const endpoint = process.env.MCP_ENDPOINT ?? '/mcp'

/**
 * 从环境变量解析 CORS 允许的 Origin 列表。
 *
 * - `MCP_CORS_ALLOWED_ORIGINS`：逗号分隔的多个 Origin
 * - 未设置时不配置 `allowedOrigins`（框架行为：不校验 Origin，便于 curl / 非浏览器客户端）
 */
function resolveAllowedOrigins(): string[] | undefined {
    const raw = process.env.MCP_CORS_ALLOWED_ORIGINS?.trim()
    if (!raw) {
        return undefined
    }
    const list = raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    return list.length > 0 ? list : undefined
}

const corsAllowedOrigins = resolveAllowedOrigins()

/**
 * 创建 MCP 服务器实例
 *
 * 配置说明：
 * - name/version：服务标识
 * - basePath：静态资源路径（指向 dist 目录）
 * - logging：是否启用日志，默认启用（设置 MCP_LOGGING=false 可禁用）
 * - tasks：任务队列配置
 *   - enabled：是否启用任务管理
 *   - defaultTtl：任务默认 TTL（毫秒），默认 300000ms (5分钟)
 *   - maxTasks：最大并发任务数，默认 100
 * - transport：传输层配置
 *   - type：HTTP Stream 协议
 *   - cors：跨域配置
 *   - auth：入口 Bearer 鉴权（见 {@link BearerIngressAuthProvider}）
 */
const server = new MCPServer({
    name: 'mcp-oauth',
    version: '0.1.0',
    basePath: join(__dirname, '..', 'dist'),
    logging: process.env.MCP_LOGGING !== 'false',
    tasks: {
        enabled: true,
        defaultTtl: 300_000,
        maxTasks: 100
    },
    transport: {
        type: 'http-stream',
        options: {
            port,
            host,
            endpoint,
            responseMode: 'stream',
            cors: {
                ...(corsAllowedOrigins
                    ? { allowedOrigins: corsAllowedOrigins }
                    : {}),
                allowMethods: 'GET, POST, DELETE, OPTIONS',
                allowHeaders:
                    'Content-Type, Authorization, x-api-key, Mcp-Session-Id',
                exposeHeaders: 'Content-Type, Authorization, Mcp-Session-Id',
                maxAge: '86400'
            },
            auth: {
                provider: new BearerIngressAuthProvider(),
                endpoints: {
                    sse: true,
                    messages: true
                }
            }
        }
    }
})

/**
 * 注册能力并启动服务器
 *
 * **addTool（MCPTool）** 与 **addPrompt（MCPPrompt）** 在协议与入口上不同，勿混用：
 *
 * | | `server.addTool`（MCPTool） | `server.addPrompt`（MCPPrompt） |
 * |---|---|---|
 * | MCP 能力 | `tools`：`tools/list`、`tools/call` | `prompts`：`prompts/list`、`prompts/get` |
 * | 典型用途 | 算数据、调接口、返回结构化结果给调用方 | 产出「发给模型的消息模板」，由宿主拼进对话 |
 * | 实现入口 | `execute()` → Tool 执行结果 | `generateMessages()`（框架经 `getMessages` 校验参数后调用） |
 * | 本包对照 | `WelcomeMessageTool`（`welcome_message`）与下方业务工具 | `GreetingPrompt`（`greeting_prompt`），与欢迎语 tool 语义相近，能力类型不同 |
 */
// ── MCPTool：addTool → tools/list、tools/call（框架启动时会对每个 tool 调用 injectServer）──
server.addTool(WelcomeMessageTool)
server.addTool(OAuth2MyAppsTool)
server.addTool(GitHubRepoTool)

// ── MCPPrompt：addPrompt → prompts/list、prompts/get（不进 toolsMap，无 injectServer）──
server.addPrompt(GreetingPrompt)

await server.start()

console.log(`mcp-oauth server running on http://${host}:${port}${endpoint}`)
console.log('入口鉴权: Authorization: Bearer <token>')
console.log('[addTool] tools: welcome_message, oauth2_my_apps, github_repo')
console.log('[addPrompt] prompts: greeting_prompt')

/**
 * 优雅关闭处理
 *
 * 捕获 SIGINT（Ctrl+C）和 SIGTERM（kill）信号，
 * 停止服务器并正常退出进程
 */
const shutdown = async () => {
    await server.stop()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
