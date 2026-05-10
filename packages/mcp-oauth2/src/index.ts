/**
 * GitHub OAuth2「单点登录」演示：浏览器在辅助端口完成授权，MCP 端口校验 GitHub access token。
 *
 * 环境变量：
 * - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`：GitHub OAuth App
 * - `GITHUB_OAUTH_PUBLIC_BASE`：辅助页面对外基址，如 `http://127.0.0.1:8789`
 * - `GITHUB_OAUTH_REDIRECT_URI`：须与 OAuth App 回调 URL 完全一致，默认 `{GITHUB_OAUTH_PUBLIC_BASE}/oauth/github/callback`
 * - `OAUTH_UI_PORT`：辅助 HTTP 端口，默认 `8789`（仅当未设置 `GITHUB_OAUTH_PUBLIC_BASE` 的端口推导时需要）
 * - `PORT` / `HOST` / `MCP_ENDPOINT`：MCP HTTP Stream 监听配置
 */

import './load-env.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Server } from 'node:http'
import { MCPServer } from 'mcp-framework'
import { GitHubAccessTokenAuthProvider } from './auth/github-access-token-auth-provider.js'
import { createGithubOAuthUiServer } from './oauth/github-oauth-ui-server.js'
import { GitHubWhoAmITool } from './tools/github-whoami-tool.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const port = Number(process.env.PORT ?? 8788)
const host = process.env.HOST ?? '0.0.0.0'
const endpoint = process.env.MCP_ENDPOINT ?? '/mcp'

const clientId = (process.env.GITHUB_CLIENT_ID ?? '').trim()
const clientSecret = (process.env.GITHUB_CLIENT_SECRET ?? '').trim()
const publicBase = (
    process.env.GITHUB_OAUTH_PUBLIC_BASE ??
    `http://127.0.0.1:${process.env.OAUTH_UI_PORT ?? '8789'}`
).replace(/\/$/, '')
const redirectUri = (
    process.env.GITHUB_OAUTH_REDIRECT_URI ??
    `${publicBase}/oauth/github/callback`
).trim()

let oauthUiServer: Server | undefined

if (clientId && clientSecret) {
    const uiPort = Number(
        process.env.OAUTH_UI_PORT ??
            (() => {
                try {
                    return new URL(publicBase).port || '8788'
                } catch {
                    return '8788'
                }
            })()
    )
    oauthUiServer = createGithubOAuthUiServer({
        clientId,
        clientSecret,
        redirectUri,
        port: uiPort,
        host: process.env.OAUTH_UI_HOST ?? '127.0.0.1'
    })
} else {
    console.warn(
        '[mcp-oauth2] 未设置 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET：已跳过浏览器 OAuth 辅助服务，仍可用已有 token 作为 Bearer 访问 MCP。'
    )
}

const server = new MCPServer({
    name: 'mcp-oauth2',
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
                allowMethods: 'GET, POST, DELETE, OPTIONS',
                allowHeaders:
                    'Content-Type, Authorization, x-api-key, Mcp-Session-Id',
                exposeHeaders: 'Content-Type, Authorization, Mcp-Session-Id',
                maxAge: '86400'
            },
            auth: {
                provider: new GitHubAccessTokenAuthProvider(),
                endpoints: {
                    sse: true,
                    messages: true
                }
            }
        }
    }
})

server.addTool(GitHubWhoAmITool)

await server.start()

console.log(`MCP (GitHub Bearer 鉴权) http://${host}:${port}${endpoint}`)
if (oauthUiServer) {
    const addr = oauthUiServer.address()
    if (addr && typeof addr === 'object') {
        console.log(
            `GitHub OAuth 演示页 http://${addr.address === '::' ? '127.0.0.1' : addr.address}:${addr.port}`
        )
    }
    console.log(`回调 URL 须与 GitHub App 一致: ${redirectUri}`)
}

const shutdown = async () => {
    await server.stop()
    await new Promise<void>((resolve, reject) => {
        if (!oauthUiServer?.listening) {
            resolve()
            return
        }
        oauthUiServer.close(err => (err ? reject(err) : resolve()))
    })
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
