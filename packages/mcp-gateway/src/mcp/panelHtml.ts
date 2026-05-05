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
      --bg: #0a0f1e;
      --bg-gradient: linear-gradient(180deg, #0a0f1e 0%, #0d1326 100%);
      --panel: #141a2d;
      --panel-hover: #1a2238;
      --text: #e9eefb;
      --muted: #6b7280;
      --ok: #34d399;
      --warn: #f59e0b;
      --error: #ef4444;
      --primary: #60a5fa;
      --primary-hover: #93c5fd;
      --border: rgba(255,255,255,0.1);
      --border-light: rgba(255,255,255,0.15);
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
      --shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
      --radius: 12px;
      --radius-sm: 8px;
      --radius-lg: 16px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Noto Sans CJK SC", sans-serif;
      background: var(--bg-gradient);
      color: var(--text);
      min-height: 100vh;
    }

    .container {
      max-width: 1024px;
      margin: 0 auto;
      padding: 32px 20px;
    }

    .header {
      margin-bottom: 24px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 32px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary) 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .desc {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      min-width: 200px;
      max-width: 320px;
      position: relative;
    }

    .search-box input {
      width: 100%;
      padding: 10px 36px 10px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--panel);
      color: var(--text);
      font-size: 13px;
      transition: all 0.2s ease;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }

    .search-box::before {
      content: '';
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      padding: 10px 16px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    button:hover {
      border-color: var(--primary);
      background: rgba(96, 165, 250, 0.1);
    }

    button:active {
      transform: scale(0.98);
    }

    button.primary {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }

    button.primary:hover {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }

    .badge {
      font-size: 12px;
      color: var(--muted);
      padding: 4px 10px;
      background: rgba(107, 114, 128, 0.1);
      border-radius: 20px;
      margin-left: auto;
    }

    .badge.success {
      color: var(--ok);
      background: rgba(52, 211, 153, 0.1);
    }

    .badge.error {
      color: var(--error);
      background: rgba(239, 68, 68, 0.1);
    }

    .list {
      display: grid;
      gap: 14px;
    }

    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      transition: all 0.25s ease;
      box-shadow: var(--shadow);
    }

    .card:hover {
      border-color: var(--border-light);
      box-shadow: var(--shadow-hover);
      transform: translateY(-1px);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .service {
      font-weight: 600;
      font-size: 16px;
      color: var(--text);
    }

    .service::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary);
      margin-right: 8px;
    }

    .endpoint {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace;
      font-size: 12px;
      color: var(--muted);
      word-break: break-all;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-sm);
    }

    .status {
      font-size: 12px;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 12px;
      margin-left: auto;
      white-space: nowrap;
    }

    .status.default {
      color: var(--muted);
      background: rgba(107, 114, 128, 0.15);
    }

    .status.ok {
      color: var(--ok);
      background: rgba(52, 211, 153, 0.15);
    }

    .status.warn {
      color: var(--warn);
      background: rgba(245, 158, 11, 0.15);
    }

    .status.error {
      color: var(--error);
      background: rgba(239, 68, 68, 0.15);
    }

    .status.loading {
      color: var(--primary);
      background: rgba(96, 165, 250, 0.15);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .actions button {
      padding: 7px 12px;
      font-size: 12px;
    }

    .details {
      margin-top: 12px;
      padding: 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: rgba(8, 12, 22, 0.6);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      color: #d3ddf7;
      max-height: 300px;
      overflow: auto;
      transition: all 0.2s ease;
    }

    .details.collapsed {
      max-height: 0;
      padding: 0 14px;
      overflow: hidden;
      border-color: transparent;
    }

    .details-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
      cursor: pointer;
      margin-top: 8px;
      padding: 4px 0;
      transition: color 0.2s ease;
    }

    .details-toggle:hover {
      color: var(--primary);
    }

    .details-toggle::before {
      content: '';
      width: 0;
      height: 0;
      border-left: 5px solid currentColor;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      transition: transform 0.2s ease;
    }

    .details-toggle.expanded::before {
      transform: rotate(90deg);
    }

    .empty {
      color: var(--muted);
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      padding: 40px 20px;
      text-align: center;
      font-size: 14px;
    }

    .empty svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-title {
      display: block;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--text);
    }

    .tool-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .tool-item {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
    }

    .tool-item:last-child {
      border-bottom: none;
    }

    .tool-name {
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 4px;
    }

    .tool-desc {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.4;
    }

    @media (max-width: 640px) {
      .container {
        padding: 20px 16px;
      }

      h1 {
        font-size: 24px;
      }

      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box {
        max-width: 100%;
      }

      .badge {
        margin-left: 0;
        align-self: flex-start;
      }

      .card-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .status {
        margin-left: 0;
        margin-top: 4px;
      }
    }
  </style>
</head>
<body>
  <main class="container">
    <header class="header">
      <h1>MCP 服务面板</h1>
      <p class="desc">查看当前网关可用服务，支持路由测试、初始化测试、查看工具列表与调用工具。</p>
    </header>

    <div class="toolbar">
      <div class="search-box">
        <input type="text" id="search" placeholder="搜索服务..." />
      </div>
      <button id="refresh" class="primary">
        <span>刷新服务列表</span>
      </button>
      <button id="copy-health">
        <span>复制 /health 地址</span>
      </button>
      <span id="total" class="badge">加载中...</span>
    </div>

    <section id="list" class="list"></section>
  </main>

  <script>
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

    const getServiceStatus = (status) => {
      if (status === 400) return { label: '可达（MCP 路由正常）', level: 'ok' }
      if (status === 404) return { label: '不可达（服务未注册）', level: 'error' }
      if (status >= 200 && status < 500) return { label: '可响应（非标准状态）', level: 'warn' }
      return { label: '请求失败', level: 'error' }
    }

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

    const closeSession = async (serviceId, sessionId) => {
      const endpoint = '/' + serviceId + '/mcp'
      await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'mcp-session-id': sessionId }
      })
    }

    const runMcpRequestInSession = async (serviceId, method, params) => {
      const initResult = await initializeSession(serviceId)

      if (!initResult.ok) {
        return { ok: false, status: 500, data: { error: initResult.message } }
      }

      const endpoint = '/' + serviceId + '/mcp'
      const requestBody = {
        jsonrpc: '2.0',
        id: method + '-' + Date.now(),
        method,
        params
      }

      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream'
      }

      if (initResult.sessionId) {
        headers['mcp-session-id'] = initResult.sessionId
      }

      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
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
        if (initResult.sessionId) {
          closeSession(serviceId, initResult.sessionId).catch(() => {})
        }
      }
    }

    const renderToolList = (tools) => {
      if (!Array.isArray(tools) || tools.length === 0) {
        return '<div style="text-align: center; color: var(--muted); padding: 12px;">暂无工具</div>'
      }

      return tools.map(tool => {
        const name = tool.name || '未命名工具'
        const description = tool.description || '无描述'
        return \`
          <div class="tool-item">
            <div class="tool-name">\${name}</div>
            <div class="tool-desc">\${description}</div>
          </div>
        \`
      }).join('')
    }

    const renderServiceCard = (serviceId) => {
      const endpoint = new URL('/' + serviceId + '/mcp', window.location.origin).toString()
      const card = document.createElement('article')
      card.className = 'card'
      card.innerHTML = \`
        <div class="card-header">
          <span class="service">\${serviceId}</span>
          <span class="status default" data-role="status">未测试</span>
        </div>
        <div class="endpoint">\${endpoint}</div>
        <div class="actions">
          <button data-action="test">路由测试</button>
          <button data-action="initialize">初始化测试</button>
          <button data-action="list-tools">查看工具</button>
          <button data-action="call-tool">调用工具</button>
          <button data-action="copy">复制引用</button>
        </div>
        <div class="details-toggle" data-role="details-toggle" style="display: none;">
          <span>查看详情</span>
        </div>
        <div class="details collapsed" data-role="details"></div>
      \`

      const statusEl = card.querySelector('[data-role="status"]')
      const detailsEl = card.querySelector('[data-role="details"]')
      const toggleEl = card.querySelector('[data-role="details-toggle"]')
      const testBtn = card.querySelector('[data-action="test"]')
      const initializeBtn = card.querySelector('[data-action="initialize"]')
      const listToolsBtn = card.querySelector('[data-action="list-tools"]')
      const callToolBtn = card.querySelector('[data-action="call-tool"]')
      const copyBtn = card.querySelector('[data-action="copy"]')

      const showDetails = (content, isJson = true) => {
        if (isJson && typeof content === 'object') {
          detailsEl.textContent = JSON.stringify(content, null, 2)
        } else {
          detailsEl.textContent = String(content)
        }
        detailsEl.classList.remove('collapsed')
        toggleEl.style.display = 'flex'
        toggleEl.classList.add('expanded')
      }

      const toggleDetails = () => {
        if (detailsEl.classList.contains('collapsed')) {
          detailsEl.classList.remove('collapsed')
          toggleEl.classList.add('expanded')
        } else {
          detailsEl.classList.add('collapsed')
          toggleEl.classList.remove('expanded')
        }
      }

      toggleEl.addEventListener('click', toggleDetails)

      testBtn.addEventListener('click', async () => {
        statusEl.className = 'status loading'
        statusEl.textContent = '测试中...'
        try {
          const resp = await fetch('/' + serviceId + '/mcp', { method: 'GET' })
          const result = getServiceStatus(resp.status)
          statusEl.className = 'status ' + result.level
          statusEl.textContent = result.label + '（' + resp.status + '）'
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '请求失败'
          showDetails('网络错误: ' + error.message, false)
        }
      })

      initializeBtn.addEventListener('click', async () => {
        statusEl.className = 'status loading'
        statusEl.textContent = '初始化测试中...'
        try {
          const result = await initializeSession(serviceId)
          if (result.sessionId) {
            closeSession(serviceId, result.sessionId).catch(() => {})
          }
          statusEl.className = 'status ' + (result.ok ? 'ok' : 'error')
          statusEl.textContent = result.message
          if (!result.ok) {
            showDetails(result, false)
          }
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '初始化请求失败'
          showDetails('网络错误: ' + error.message, false)
        }
      })

      listToolsBtn.addEventListener('click', async () => {
        statusEl.className = 'status loading'
        statusEl.textContent = '读取工具中...'
        try {
          const result = await runMcpRequestInSession(serviceId, 'tools/list', {})

          if (!result.ok || result.data?.error) {
            statusEl.className = 'status error'
            statusEl.textContent = '读取工具失败（' + result.status + '）'
            showDetails(result.data || result, true)
            return
          }

          const tools = result.data?.result?.tools || []
          statusEl.className = 'status ok'
          statusEl.textContent = '工具数量：' + tools.length

          if (tools.length > 0) {
            detailsEl.innerHTML = '<div class="tool-list">' + renderToolList(tools) + '</div>'
            detailsEl.classList.remove('collapsed')
            toggleEl.style.display = 'flex'
            toggleEl.classList.add('expanded')
          } else {
            showDetails({ total: 0, tools: [] }, true)
          }
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '读取工具异常'
          showDetails('网络错误: ' + error.message, false)
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

        statusEl.className = 'status loading'
        statusEl.textContent = '调用工具中...'
        try {
          const result = await runMcpRequestInSession(serviceId, 'tools/call', {
            name: toolName,
            arguments: args
          })

          if (!result.ok || result.data?.error) {
            statusEl.className = 'status error'
            statusEl.textContent = '调用失败（' + result.status + '）'
          } else {
            statusEl.className = 'status ok'
            statusEl.textContent = '调用成功（' + result.status + '）'
          }
          showDetails(result.data, true)
        } catch (error) {
          statusEl.className = 'status error'
          statusEl.textContent = '调用异常'
          showDetails('网络错误: ' + error.message, false)
        }
      })

      copyBtn.addEventListener('click', async () => {
        try {
          await copyText(endpoint)
          const originalText = copyBtn.textContent
          copyBtn.textContent = '已复制 ✓'
          setTimeout(() => { copyBtn.textContent = originalText }, 1500)
        } catch (error) {
          const originalText = copyBtn.textContent
          copyBtn.textContent = '复制失败'
          setTimeout(() => { copyBtn.textContent = originalText }, 1500)
        }
      })

      return card
    }

    const loadServices = async (filter = '') => {
      const totalEl = document.getElementById('total')
      const listEl = document.getElementById('list')
      totalEl.textContent = '加载中...'
      totalEl.className = 'badge'
      listEl.innerHTML = ''

      try {
        const resp = await fetch('/health')
        if (!resp.ok) throw new Error('health request failed')
        const data = await resp.json()
        const serviceList = Array.isArray(data.services) ? data.services : []

        const filteredList = filter
          ? serviceList.filter(s => s.toLowerCase().includes(filter.toLowerCase()))
          : serviceList

        totalEl.textContent = '共 ' + filteredList.length + ' 个服务'
        totalEl.className = 'badge' + (filteredList.length > 0 ? ' success' : ' error')

        if (filteredList.length === 0) {
          listEl.innerHTML = \`
            <div class="empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span class="empty-title">\${filter ? '未找到匹配的服务' : '当前没有可用 MCP 服务'}</span>
              <span>\${filter ? '请尝试其他搜索关键词' : '请检查 MCP 服务是否已正确注册'}</span>
            </div>
          \`
          return
        }

        filteredList.forEach(serviceId => {
          listEl.appendChild(renderServiceCard(serviceId))
        })
      } catch (error) {
        totalEl.textContent = '加载失败'
        totalEl.className = 'badge error'
        listEl.innerHTML = \`
          <div class="empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span class="empty-title">无法读取服务列表</span>
            <span>请检查网关状态或网络连接</span>
          </div>
        \`
      }
    }

    document.getElementById('refresh').addEventListener('click', () => {
      const searchInput = document.getElementById('search')
      loadServices(searchInput.value)
    })

    document.getElementById('copy-health').addEventListener('click', async () => {
      const healthUrl = new URL('/health', window.location.origin).toString()
      await copyText(healthUrl)
      const btn = document.getElementById('copy-health')
      const originalText = btn.textContent
      btn.textContent = '已复制 ✓'
      setTimeout(() => { btn.textContent = originalText }, 1500)
    })

    document.getElementById('search').addEventListener('input', (e) => {
      loadServices(e.target.value)
    })

    loadServices()
  </script>
</body>
</html>`
