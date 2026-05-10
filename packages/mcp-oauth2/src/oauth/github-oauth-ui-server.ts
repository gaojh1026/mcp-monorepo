import { createServer, type Server } from 'node:http'
import { randomBytes } from 'node:crypto'
import { exchangeGitHubOAuthCode } from '../lib/github-oauth-exchange.js'
import { fetchGitHubUser } from '../lib/github-user.js'

const STATE_TTL_MS = 600_000

type PendingState = { createdAt: number }

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function pruneStates(map: Map<string, PendingState>): void {
    const now = Date.now()
    for (const [k, v] of map) {
        if (now - v.createdAt > STATE_TTL_MS) {
            map.delete(k)
        }
    }
}

export type GithubOAuthUiServerOptions = {
    clientId: string
    clientSecret: string
    /** 须与 GitHub OAuth App 中「Authorization callback URL」一致，默认 `{publicBaseUrl}/oauth/github/callback` */
    redirectUri: string
    /** OAuth scope，默认 `read:user` */
    scope?: string
    host?: string
    port: number
}

/**
 * 轻量 HTTP 服务：提供「跳转 GitHub 授权」与「回调换 token」页面，便于本地演示 SSO。
 * MCP 本体仍在另一端口，客户端在拿到 token 后以 Bearer 连接 MCP。
 */
export function createGithubOAuthUiServer(
    options: GithubOAuthUiServerOptions
): Server {
    const scope = options.scope ?? 'read:user'
    const states = new Map<string, PendingState>()
    const callbackPath = new URL(options.redirectUri).pathname

    return createServer(async (req, res) => {
        try {
            const host = req.headers.host ?? 'localhost'
            const url = new URL(req.url ?? '/', `http://${host}`)

            if (req.method === 'GET' && url.pathname === '/') {
                const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"/><title>GitHub SSO Demo</title></head>
<body>
  <h1>GitHub OAuth 演示</h1>
  <p><a href="/oauth/github">使用 GitHub 登录并获取 access token</a></p>
  <p>登录成功后请将 token 配置到 MCP 客户端的 <code>Authorization: Bearer …</code>。</p>
</body>
</html>`
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
                res.end(html)
                return
            }

            if (req.method === 'GET' && url.pathname === '/oauth/github') {
                pruneStates(states)
                const state = randomBytes(24).toString('hex')
                states.set(state, { createdAt: Date.now() })
                const authorize = new URL(
                    'https://github.com/login/oauth/authorize'
                )
                authorize.searchParams.set('client_id', options.clientId)
                authorize.searchParams.set('redirect_uri', options.redirectUri)
                authorize.searchParams.set('scope', scope)
                authorize.searchParams.set('state', state)
                res.writeHead(302, { Location: authorize.toString() })
                res.end()
                return
            }

            if (req.method === 'GET' && url.pathname === callbackPath) {
                const code = url.searchParams.get('code')
                const state = url.searchParams.get('state')
                const err = url.searchParams.get('error_description') ?? url.searchParams.get('error')

                if (err) {
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end(
                        `<p>授权失败：${escapeHtml(err)}</p><p><a href="/">返回</a></p>`
                    )
                    return
                }
                if (!code || !state || !states.has(state)) {
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end('<p>无效或已过期的 state</p><p><a href="/">返回</a></p>')
                    return
                }
                states.delete(state)

                let accessToken: string
                try {
                    const tok = await exchangeGitHubOAuthCode(
                        options.clientId,
                        options.clientSecret,
                        code,
                        options.redirectUri
                    )
                    accessToken = tok.access_token
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e)
                    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end(
                        `<p>换取 token 失败：${escapeHtml(msg)}</p><p><a href="/">返回</a></p>`
                    )
                    return
                }

                const user = await fetchGitHubUser(accessToken)
                const login = user?.login ?? '(unknown)'
                const safeToken = escapeHtml(accessToken)

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
                res.end(`<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"/><title>授权成功</title></head>
<body>
  <h1>授权成功</h1>
  <p>GitHub 用户：<strong>${escapeHtml(login)}</strong></p>
  <p>请把下列 token 配置到 MCP 客户端请求头（演示环境请勿泄露到公网）：</p>
  <pre style="word-break:break-all;background:#f4f4f4;padding:12px">${safeToken}</pre>
  <p><a href="/">再次登录</a></p>
</body>
</html>`)
                return
            }

            res.writeHead(404).end('Not Found')
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            if (!res.headersSent) {
                res.writeHead(500).end(msg)
            }
        }
    }).listen(options.port, options.host ?? '127.0.0.1')
}
