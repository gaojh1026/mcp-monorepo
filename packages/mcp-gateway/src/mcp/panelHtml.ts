/**
 * @fileoverview `/services` 内嵌管理面板 HTML
 * @module mcp-gateway/mcp/panelHtml
 */
export const SERVICES_PANEL_HTML = `<!doctype html>
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
