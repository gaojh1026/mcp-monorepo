## MCP Monorepo（多 MCP 服务）

这个仓库用 `pnpm workspace` 管理多个 MCP 服务（每个服务一个 package）。生产部署推荐使用 **单网关应用**（`@mcp/gateway`）加载所有服务，并通过 URL 路径自动路由：

- `https://<host>/<service>/mcp`（例如 `https://mcp.example.com/fetch/mcp`）

### 目录结构（约定）

- `packages/mcp-*`：一个 MCP 服务（可独立部署）
- 每个服务默认监听 `PORT`（如 `8787`），对外提供 `http(s)://<host>:<port>/mcp`

### 本地运行

1. 安装依赖：

```bash
pnpm install
```

2. 启动所有有 `dev` 脚本的服务：

```bash
pnpm dev
```

### 示例：@mcp/fetch

启动：

```bash
pnpm -C packages/mcp-fetch dev
```

默认地址：

- `http://localhost:8787/mcp`

### 网关模式（单项目部署，多路由分发）

启动网关：

```bash
MCP_GATEWAY_DEV=1 pnpm -C packages/mcp-gateway dev
```

默认地址：

- `http://localhost:8787/<service>/mcp`（例如 `http://localhost:8787/fetch/mcp`）

### 给别人用的配置示例

不同客户端字段可能叫法不同，你给出的写法可以这样配（URL 指向服务的 `/mcp`）：

```json
{
    "mcpServers": {
        "fetch": {
            "type": "streamable_http",
            "url": "https://YOUR_DOMAIN_OR_IP/fetch/mcp"
        }
    }
}
```

### 部署思路（推荐：单网关）

运行 `@mcp/gateway` 一个服务即可。网关会自动发现 `packages/mcp-*`（排除 `mcp-gateway`），并把每个服务挂载到 `/<service>/mcp`。

### 新增一个 MCP 服务（推荐做法）

1. 复制一份 `packages/mcp-fetch` 为 `packages/mcp-<name>`
2. 修改新包的 `package.json#name`、`src/index.ts` 里的 `name/version`
3. 在 `src/tools/` 里新增你的工具类（每个文件一个 Tool）
