/**
 * @fileoverview MCP Gateway - 统一网关入口
 * 自动发现并路由所有 MCP 服务到 /<service>/mcp 路径
 * @module mcp-gateway
 */

import { createServer, request as httpRequest } from 'node:http'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, resolve } from 'node:path'
import { request as httpsRequest } from 'node:https'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { loadServices, type ExternalMcpService, type McpService } from './serviceRegistry.js'

/**
 * HTTP 服务器端口，默认为 8787
 * 可通过环境变量 PORT 覆盖
 */
const port = Number(process.env.PORT ?? 8787)

/**
 * HTTP 服务器监听地址
 * 默认为 0.0.0.0（容器/局域网可访问）
 */
const host = process.env.HOST ?? '0.0.0.0'

/**
 * 请求体最大字节数，默认为 4MB
 * 防止恶意大请求耗尽服务器资源
 */
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 4 * 1024 * 1024)

/**
 * 从 HTTP 请求中读取并解析 JSON body
 * @param req - HTTP 请求对象
 * @returns 解析后的 JSON 对象
 * @throws 超过最大字节限制时销毁连接
 */
const readJsonBody = async (req: import('node:http').IncomingMessage) => {
    return await new Promise<any>((resolve, reject) => {
        let body = ''
        let size = 0
        req.on('data', chunk => {
            size += chunk.length
            if (size > MAX_BODY_BYTES) {
                req.destroy()
                reject(
                    new Error(
                        `Request body exceeds maximum size of ${MAX_BODY_BYTES} bytes`
                    )
                )
                return
            }
            body += chunk.toString()
        })
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : null)
            } catch (e) {
                reject(e)
            }
        })
        req.on('error', reject)
    })
}

/**
 * 设置 CORS 响应头，支持跨域请求
 * @param res - HTTP 响应对象
 * @param includeMaxAge - 是否包含 Access-Control-Max-Age 头（预检请求缓存时间，默认不包含）
 */
const setCorsHeaders = (
    res: import('node:http').ServerResponse,
    includeMaxAge = false
) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, mcp-session-id, Accept, Authorization, X-API-Key'
    )
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
    if (includeMaxAge) res.setHeader('Access-Control-Max-Age', '86400')
}

/**
 * 发送 JSON-RPC 错误响应
 * @param res - HTTP 响应对象
 * @param status - HTTP 状态码
 * @param code - JSON-RPC 错误码（负数）
 * @param message - 错误消息
 */
const sendJsonRpcError = (
    res: import('node:http').ServerResponse,
    status: number,
    code: number,
    message: string
) => {
    if (res.headersSent) return
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(
        JSON.stringify({
            jsonrpc: '2.0',
            error: { code, message },
            id: null
        })
    )
}

/**
 * 将网关路由路径标准化为 SDK 传输层默认端点 `/mcp`
 * 外部请求路径是 `/{serviceId}/mcp`，但 StreamableHTTPServerTransport
 * 在内部通常按 `/mcp` 处理，因此这里临时改写 req.url 再转发。
 * @param req - HTTP 请求对象
 * @param internalPath - 传输层内部路径
 * @param handler - 实际处理函数
 */
const withInternalPath = async (
    req: import('node:http').IncomingMessage,
    internalPath: string,
    handler: () => Promise<void>
) => {
    const originalUrl = req.url
    req.url = internalPath
    try {
        await handler()
    } finally {
        req.url = originalUrl
    }
}

/**
 * 解析 URL 路径提取服务 ID
 * 期望格式: /{serviceId}/mcp
 * @param pathname - URL 路径名
 * @returns 包含 serviceId 的对象，或 null（路径格式不匹配）
 * @example
 * parseServicePath('/fetch/mcp') // => { serviceId: 'fetch' }
 * parseServicePath('/poem/mcp')  // => { serviceId: 'poem' }
 */
const parseServicePath = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    if (parts[1] !== 'mcp') return null
    return { serviceId: parts[0] }
}

/**
 * 向上遍历目录查找 monorepo 根目录
 * 通过 pnpm-workspace.yaml 文件标识
 * @param startDir - 起始目录（通常为 process.cwd()）
 * @returns 找到的根目录路径，或返回起始目录
 */
const findRepoRoot = (startDir: string) => {
    let current = resolve(startDir)
    for (let i = 0; i < 10; i++) {
        if (existsSync(resolve(current, 'pnpm-workspace.yaml'))) return current
        const parent = dirname(current)
        if (parent === current) break
        current = parent
    }
    return startDir
}

/**
 * 快速探测 TCP 端口是否可连（不重试），用于判断是否已存在外部进程。
 * @param host - 目标主机
 * @param port - 目标端口
 * @param timeoutMs - 探测超时时间
 */
const isTcpPortOpen = async (
    host: string,
    port: number,
    timeoutMs = 500
): Promise<boolean> => {
    return await new Promise<boolean>(resolve => {
        const socket = createConnection({ host, port })
        let settled = false

        const finish = (ok: boolean) => {
            if (settled) return
            settled = true
            try {
                socket.destroy()
            } catch {
                // ignore
            }
            resolve(ok)
        }

        socket.setTimeout(timeoutMs)
        socket.once('connect', () => finish(true))
        socket.once('error', () => finish(false))
        socket.once('timeout', () => finish(false))
    })
}

/**
 * 等待 TCP 端口可连就绪（重试直到 timeoutMs）。
 * @param host - 目标主机
 * @param port - 目标端口
 * @param timeoutMs - 最大等待时间
 */
const waitForTcpReady = async (
    host: string,
    port: number,
    timeoutMs: number
): Promise<void> => {
    const deadline = Date.now() + timeoutMs
    const intervalMs = 200

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const ok = await isTcpPortOpen(host, port, 500)
        if (ok) return
        if (Date.now() > deadline) {
            throw new Error(`External service not ready: ${host}:${port}`)
        }
        await new Promise(r => setTimeout(r, intervalMs))
    }
}

/**
 * 对 external MCP 服务启动对应进程并等待其 ready。
 * @param service - 外部服务定义
 */
const ensureExternalServicesStarted = async (
    services: Map<string, McpService>
) => {
    const externalServices = Array.from(services.values()).filter(
        (s): s is ExternalMcpService => s.type === 'external'
    )

    const started = await Promise.all(
        externalServices.map(async service => {
            // 若端口本来就可连，则跳过 spawn，避免重复启动冲突
            const portOpen = await isTcpPortOpen(
                service.ready.host,
                service.ready.port,
                300
            )
            if (!portOpen) {
                const env = { ...process.env, ...(service.spawn.env ?? {}) }
                const child = spawn(service.spawn.command, service.spawn.args, {
                    cwd: service.spawn.cwd,
                    env,
                    shell: service.spawn.shell ?? false,
                    stdio: 'inherit'
                })

                service.process = child

                child.once('exit', (code, signal) => {
                    // eslint-disable-next-line no-console
                    console.warn(
                        `[mcp-gateway] external service '${service.id}' exited (code=${code}, signal=${signal})`
                    )
                })
            }

            await waitForTcpReady(
                service.ready.host,
                service.ready.port,
                service.ready.timeoutMs
            )
        })
    )

    void started
}

/**
 * 反向代理 external 服务请求（包含 SSE 的流式响应透传）。
 * @param req - HTTP 请求
 * @param res - HTTP 响应
 * @param service - external 服务
 * @param url - 网关侧解析后的 URL
 */
const proxyExternalRequest = async (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    service: ExternalMcpService,
    url: URL
) => {
    const upstreamPath = service.upstream.path.startsWith('/')
        ? service.upstream.path
        : `/${service.upstream.path}`
    const targetUrl = new URL(upstreamPath, service.upstream.baseUrl)
    targetUrl.search = url.search

    const proxyHeaders: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue
        proxyHeaders[k] = Array.isArray(v) ? v[0] : v
    }
    proxyHeaders.host = targetUrl.host
    // 与上游一致，避免 upstream 做额外的 DNS rebinding/host 校验时依赖 forwarded 头
    proxyHeaders['x-forwarded-host'] = targetUrl.host
    proxyHeaders['x-forwarded-port'] = targetUrl.port
    proxyHeaders['x-forwarded-proto'] = targetUrl.protocol.replace(':', '')

    const isHttps = targetUrl.protocol === 'https:'
    const requester = isHttps ? httpsRequest : httpRequest

    await new Promise<void>((resolve, reject) => {
        const proxyReq = requester(
            {
                method: req.method,
                protocol: targetUrl.protocol,
                hostname: targetUrl.hostname,
                port: targetUrl.port,
                path: targetUrl.pathname + targetUrl.search,
                headers: proxyHeaders
            },
            proxyRes => {
                const corsHeaders: Record<string, string> = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods':
                        'GET, POST, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers':
                        'Content-Type, mcp-session-id, Accept, Authorization, X-API-Key',
                    'Access-Control-Expose-Headers': 'mcp-session-id'
                }

                if (!res.headersSent) {
                    res.writeHead(
                        proxyRes.statusCode ?? 502,
                        Object.assign({}, proxyRes.headers as any, corsHeaders)
                    )
                }
                proxyRes.pipe(res)

                proxyRes.on('end', () => resolve())
            }
        )

        proxyReq.on('error', err => reject(err))
        req.on('aborted', () => proxyReq.destroy())

        req.pipe(proxyReq)
    }).catch(err => {
        if (res.headersSent) return
        res.writeHead(502).end(`Bad Gateway: ${(err as Error).message}`)
    })
}

/**
 * 网关路由表：serviceId -> McpService
 * 在模块加载时初始化，自动发现所有 mcp-* 服务
 */
const repoRoot = findRepoRoot(process.cwd())
const services = await loadServices(repoRoot)
await ensureExternalServicesStarted(services)

/**
 * MCP 网关 HTTP 服务器
 * 路由规则：
 * - GET  /health           - 健康检查，返回所有已注册服务列表
 * - OPTIONS /*             - CORS 预检请求
 * - GET|POST /{service}/mcp - MCP 协议端点，按 service 路由
 */
const server = createServer(async (req, res) => {
    try {
        const url = new URL(
            req.url ?? '/',
            `http://${req.headers.host ?? 'localhost'}`
        )

        if (req.method === 'OPTIONS') {
            setCorsHeaders(res, true)
            res.writeHead(204).end()
            return
        }

        setCorsHeaders(res)

        if (req.method === 'GET' && url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(
                JSON.stringify({
                    ok: true,
                    services: Array.from(services.keys())
                })
            )
            return
        }

        if (req.method === 'GET' && url.pathname === '/services') {
            const pageHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MCP Services</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0b1020;
      --panel: #141a2d;
      --text: #e9eefb;
      --muted: #a9b3cf;
      --ok: #34d399;
      --warn: #f59e0b;
      --error: #ef4444;
      --primary: #60a5fa;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Noto Sans CJK SC", sans-serif;
      background: linear-gradient(180deg, #0a0f1e 0%, #0d1326 100%);
      color: var(--text);
    }
    .container {
      max-width: 980px;
      margin: 0 auto;
      padding: 28px 18px 32px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }
    .desc {
      margin: 0 0 18px;
      color: var(--muted);
      font-size: 14px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    button {
      border: 1px solid rgba(255,255,255,0.15);
      background: var(--panel);
      color: var(--text);
      padding: 7px 11px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    button:hover { border-color: var(--primary); }
    .badge {
      font-size: 12px;
      color: var(--muted);
      margin-left: auto;
    }
    .list {
      display: grid;
      gap: 10px;
    }
    .card {
      background: rgba(20,26,45,0.9);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      padding: 12px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .service {
      font-weight: 600;
      font-size: 16px;
      margin-right: 8px;
    }
    .endpoint {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace;
      font-size: 12px;
      color: var(--muted);
      word-break: break-all;
    }
    .status {
      margin-left: auto;
      font-size: 12px;
      color: var(--muted);
    }
    .status.ok { color: var(--ok); }
    .status.error { color: var(--error); }
    .status.warn { color: var(--warn); }
    .empty {
      color: var(--muted);
      border: 1px dashed rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 18px;
      text-align: center;
      font-size: 14px;
    }
    .details {
      margin-top: 8px;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(8,12,22,0.55);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      color: #d3ddf7;
      max-height: 220px;
      overflow: auto;
    }
  </style>
</head>
<body>
  <main class="container">
    <h1>MCP 服务面板</h1>
    <p class="desc">查看当前网关可用服务，支持路由测试、初始化测试与复制引用路径。</p>
    <div class="toolbar">
      <button id="refresh">刷新服务列表</button>
      <button id="copy-health">复制 /health 地址</button>
      <span id="total" class="badge">加载中...</span>
    </div>
    <section id="list" class="list"></section>
  </main>
  <script>
    /**
     * 复制文本到剪贴板
     * @param {string} text 待复制文本
     */
    const copyText = async (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return
      }
      const input = document.createElement('textarea')
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }

    /**
     * 根据状态码判断服务可达性
     * 存在的服务 GET /{service}/mcp 在无 session 下会返回 400
     * @param {number} status HTTP 状态码
     * @returns {{label: string, level: 'ok'|'warn'|'error'}}
     */
    const getServiceStatus = (status) => {
      if (status === 400) return { label: '可达（MCP 路由正常）', level: 'ok' }
      if (status === 404) return { label: '不可达（服务未注册）', level: 'error' }
      if (status >= 200 && status < 500) return { label: '可响应（非标准状态）', level: 'warn' }
      return { label: '请求失败', level: 'error' }
    }

    /**
     * 发送 MCP initialize 请求测试协议可用性
     * @param {string} serviceId 服务 ID
     * @returns {Promise<{ok: boolean, message: string}>}
     */
    const initializeSession = async (serviceId) => {
      const endpoint = '/' + serviceId + '/mcp'
      const initializeBody = {
        jsonrpc: '2.0',
        id: 'init-test-' + Date.now(),
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'mcp-gateway-services-ui',
            version: '0.1.0'
          }
        }
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream'
        },
        body: JSON.stringify(initializeBody)
      })

      const sessionId = resp.headers.get('mcp-session-id')
      if (!resp.ok) {
        return { ok: false, message: '初始化失败（' + resp.status + '）', sessionId: null }
      }

      return { ok: true, message: '初始化成功（' + resp.status + '）', sessionId }
    }

    /**
     * 关闭 MCP 会话
     * @param {string} serviceId 服务 ID
     * @param {string} sessionId 会话 ID
     * @returns {Promise<void>}
     */
    const closeSession = async (serviceId, sessionId) => {
      const endpoint = '/' + serviceId + '/mcp'
      await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'mcp-session-id': sessionId }
      })
    }

    /**
     * 在独立会话中执行 MCP 请求
     * @param {string} serviceId 服务 ID
     * @param {string} method JSON-RPC method
     * @param {Record<string, any>} params JSON-RPC params
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    const runMcpRequestInSession = async (serviceId, method, params) => {
      const initResult = await initializeSession(serviceId)
      if (!initResult.ok || !initResult.sessionId) {
        return { ok: false, status: 500, data: { error: initResult.message } }
      }

      const endpoint = '/' + serviceId + '/mcp'
      const requestBody = {
        jsonrpc: '2.0',
        id: method + '-' + Date.now(),
        method,
        params
      }

      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            'mcp-session-id': initResult.sessionId
          },
          body: JSON.stringify(requestBody)
        })

        const contentType = resp.headers.get('content-type') || ''
        let data = null
        if (contentType.includes('application/json')) {
          data = await resp.json()
        } else {
          data = await resp.text()
        }
        return { ok: resp.ok, status: resp.status, data }
      } finally {
        closeSession(serviceId, initResult.sessionId).catch(() => {})
      }
    }

    /**
     * 构建单个服务卡片
     * @param {string} serviceId 服务 ID
     * @returns {HTMLElement}
     */
    const renderServiceCard = (serviceId) => {
      const endpoint = new URL('/' + serviceId + '/mcp', window.location.origin).toString()
      const card = document.createElement('article')
      card.className = 'card'
      card.innerHTML = [
        '<div class="row">',
        '  <span class="service">' + serviceId + '</span>',
        '  <button data-action="test">测试</button>',
        '  <button data-action="initialize">初始化测试</button>',
        '  <button data-action="list-tools">查看工具</button>',
        '  <button data-action="call-tool">调用工具</button>',
        '  <button data-action="copy">复制引用</button>',
        '  <span class="status" data-role="status">未测试</span>',
        '</div>',
        '<div class="endpoint">' + endpoint + '</div>',
        '<div class="details" data-role="details">点击“查看工具”可查看工具数量与列表。</div>'
      ].join('')

      const statusEl = card.querySelector('[data-role="status"]')
      const detailsEl = card.querySelector('[data-role="details"]')
      const testBtn = card.querySelector('[data-action="test"]')
      const initializeBtn = card.querySelector('[data-action="initialize"]')
      const listToolsBtn = card.querySelector('[data-action="list-tools"]')
      const callToolBtn = card.querySelector('[data-action="call-tool"]')
      const copyBtn = card.querySelector('[data-action="copy"]')

      testBtn.addEventListener('click', async () => {
        statusEl.className = 'status'
        statusEl.textContent = '测试中...'
        try {
          const resp = await fetch('/' + serviceId + '/mcp', { method: 'GET' })
          const result = getServiceStatus(resp.status)
          statusEl.className = 'status ' + result.level
          statusEl.textContent = result.label + '（' + resp.status + '）'
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '请求失败'
        }
      })

      initializeBtn.addEventListener('click', async () => {
        statusEl.className = 'status'
        statusEl.textContent = '初始化测试中...'
        try {
          const result = await initializeSession(serviceId)
          if (result.sessionId) {
            closeSession(serviceId, result.sessionId).catch(() => {})
          }
          statusEl.className = 'status ' + (result.ok ? 'ok' : 'error')
          statusEl.textContent = result.message
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '初始化请求失败'
        }
      })

      listToolsBtn.addEventListener('click', async () => {
        statusEl.className = 'status'
        statusEl.textContent = '读取工具中...'
        try {
          const result = await runMcpRequestInSession(serviceId, 'tools/list', {})
          if (!result.ok || !result.data || result.data.error) {
            statusEl.className = 'status error'
            statusEl.textContent = '读取工具失败（' + result.status + '）'
            detailsEl.textContent = JSON.stringify(result.data, null, 2)
            return
          }

          const tools = Array.isArray(result.data.result && result.data.result.tools)
            ? result.data.result.tools
            : []
          statusEl.className = 'status ok'
          statusEl.textContent = '工具数量：' + tools.length
          detailsEl.textContent = JSON.stringify({
            total: tools.length,
            tools
          }, null, 2)
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '读取工具异常'
          detailsEl.textContent = String(error)
        }
      })

      callToolBtn.addEventListener('click', async () => {
        const toolName = window.prompt('请输入工具名（如 get_poem）')
        if (!toolName) return
        const argsText = window.prompt('请输入 JSON 参数（默认 {}）', '{}') || '{}'
        let args = {}
        try {
          args = JSON.parse(argsText)
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '参数 JSON 格式错误'
          return
        }

        statusEl.className = 'status'
        statusEl.textContent = '调用工具中...'
        try {
          const result = await runMcpRequestInSession(serviceId, 'tools/call', {
            name: toolName,
            arguments: args
          })
          if (!result.ok || (result.data && result.data.error)) {
            statusEl.className = 'status error'
            statusEl.textContent = '调用失败（' + result.status + '）'
          } else {
            statusEl.className = 'status ok'
            statusEl.textContent = '调用成功（' + result.status + '）'
          }
          detailsEl.textContent = JSON.stringify(result.data, null, 2)
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '调用异常'
          detailsEl.textContent = String(error)
        }
      })

      copyBtn.addEventListener('click', async () => {
        try {
          await copyText(endpoint)
          copyBtn.textContent = '已复制'
          setTimeout(() => { copyBtn.textContent = '复制引用' }, 1000)
        } catch (error) {
          copyBtn.textContent = '复制失败'
          setTimeout(() => { copyBtn.textContent = '复制引用' }, 1200)
        }
      })

      return card
    }

    /**
     * 拉取并渲染服务列表
     * @returns {Promise<void>}
     */
    const loadServices = async () => {
      const totalEl = document.getElementById('total')
      const listEl = document.getElementById('list')
      totalEl.textContent = '加载中...'
      listEl.innerHTML = ''
      try {
        const resp = await fetch('/health')
        if (!resp.ok) throw new Error('health request failed')
        const data = await resp.json()
        const serviceList = Array.isArray(data.services) ? data.services : []
        totalEl.textContent = '共 ' + serviceList.length + ' 个服务'
        if (serviceList.length === 0) {
          listEl.innerHTML = '<div class="empty">当前没有可用 MCP 服务</div>'
          return
        }
        serviceList.forEach(serviceId => {
          listEl.appendChild(renderServiceCard(serviceId))
        })
      } catch (error) {
        totalEl.textContent = '加载失败'
        listEl.innerHTML = '<div class="empty">无法读取 /health，请检查网关状态</div>'
      }
    }

    document.getElementById('refresh').addEventListener('click', loadServices)
    document.getElementById('copy-health').addEventListener('click', async () => {
      const healthUrl = new URL('/health', window.location.origin).toString()
      await copyText(healthUrl)
    })
    loadServices()
  </script>
</body>
</html>`
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(pageHtml)
            return
        }

        const route = parseServicePath(url.pathname)
        if (!route) {
            res.writeHead(404).end('Not Found')
            return
        }
        const internalPath = `/mcp${url.search}`

        const service = services.get(route.serviceId)
        if (!service) {
            res.writeHead(404).end('Service Not Found')
            return
        }

        if (service.type === 'external') {
            await proxyExternalRequest(req, res, service, url)
            return
        }

        const sessionIdHeader = req.headers['mcp-session-id']
        const sessionId = Array.isArray(sessionIdHeader)
            ? sessionIdHeader[0]
            : sessionIdHeader

        const body = req.method === 'POST' ? await readJsonBody(req) : null
        const isInit = !sessionId && body && isInitializeRequest(body)
        const isReInit = Boolean(
            sessionId &&
            !service.sessions.has(sessionId) &&
            body &&
            isInitializeRequest(body)
        )

        if (sessionId && service.sessions.has(sessionId)) {
            const { transport } = service.sessions.get(sessionId)!
            await withInternalPath(req, internalPath, async () => {
                await transport.handleRequest(req, res, body)
            })
            return
        }

        if (isInit || isReInit) {
            let transport: StreamableHTTPServerTransport
            let isClosingSession = false
            const sdkServer = (
                service.server as any
            ).createSDKServerForSession()
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: sid => {
                    service.sessions.set(sid, { transport, sdkServer })
                },
                // 允许初始化阶段返回 JSON，避免部分客户端在 SSE 首包阶段超时
                enableJsonResponse: true
            })
            transport.onclose = async () => {
                if (isClosingSession) return
                isClosingSession = true
                if (transport.sessionId) {
                    service.sessions.delete(transport.sessionId)
                }
                try {
                    await sdkServer.close()
                } catch {
                    // ignore
                } finally {
                    isClosingSession = false
                }
            }

            await sdkServer.connect(transport)

            await withInternalPath(req, internalPath, async () => {
                await transport.handleRequest(req, res, body)
            })
            return
        }

        if (!sessionId) {
            sendJsonRpcError(
                res,
                400,
                -32000,
                'Bad Request: No valid session ID provided'
            )
            return
        }

        sendJsonRpcError(res, 404, -32001, 'Session not found')
    } catch (e: any) {
        if (!res.headersSent) res.writeHead(500).end('Internal Server Error')
    }
})

/**
 * 启动 MCP 网关服务器
 * 监听地址: host:port
 * 可通过 MCP_GATEWAY_DEV=1 环境变量启用开发模式
 */
server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(
        `MCP Gateway listening on ${host}:${port} (routes: /<service>/mcp)`
    )
})
