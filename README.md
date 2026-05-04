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

### Docker 镜像构建（`Dockerfile`）

根目录 `Dockerfile` 为多阶段构建：**默认产物是 `mcp-gateway` 镜像**；另有一条可选目标 **`playwright-mcp`**（`@playwright/mcp` 独立容器镜像），需显式 `--target playwright-mcp` 才会构建。

常用脚本（在仓库根目录执行）：

| 脚本 | 作用 |
|------|------|
| `pnpm docker:build` | `docker build -f Dockerfile -t mcp-gateway:<TAG> .`，依赖走默认 `NPM_REGISTRY`（`Dockerfile` 中为 npm 官方源） |
| `pnpm docker:build:mirror` | 同上，但增加 `--build-arg NPM_REGISTRY=https://registry.npmmirror.com`，构建时 `pnpm install` 走 npmmirror，适合国内网络 |

`TAG` 未设置时由脚本用时间戳生成；与 `docker:build` 相比，`docker:build:mirror` **仅多一个 registry 构建参数**，镜像仍是网关。

#### FAQ：`docker:build:mirror` 会不会把 Playwright 那套也打进去？

不会。不带 `--target` 时，Docker 只构建到达**最后一个阶段**（`runtime`）所需的层，依赖链是 **`deps` → `build` → `runtime`**。`playwright-mcp` 与网关这条链无依赖关系，**默认构建不会去执行** Playwright 阶段的 `RUN` / `COPY`。只有需要 Playwright MCP 容器镜像时，才使用例如 `docker build -f Dockerfile --target playwright-mcp -t <名>:<tag> .`。

#### FAQ：同一个 `Dockerfile` 里为什么还写 Playwright？

这是 **同一文件维护两条产品线**：网关镜像是 monorepo 主部署；Playwright 镜像是子包发布 / CI（如 `packages/mcp-playwright` 的 `docker-build`、发布工作流）使用的**另一张镜像**，进程与入口与网关不同。写成多阶段、可选 `--target`，是为了在仓库根目录只保留一个 `Dockerfile`。

#### FAQ：为什么 `Dockerfile` 里先 COPY 一堆各包的 `package.json`，再安装、再打包？

1. **pnpm workspace 要求**：除根目录 `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml` 外，每个 workspace 包在镜像里也要有对应路径下的 `package.json`，`pnpm install` 才能解析依赖图并与 lockfile 一致。
2. **分层缓存**：先只复制「清单文件」并执行 `pnpm install`，再 `COPY` 完整源码并 `pnpm build`。这样日常只改 `.ts` 时，**依赖安装层仍可命中缓存**，不必每次构建都重新下载依赖；真正编译发生在后面的 `build` 阶段。

#### FAQ：`-t mcp-gateway:check` 这种 tag 是仓库约定吗？

不是。`-t <仓库名>:<tag>` 里的 `tag`（例如 `check`）只是**本次构建起的本地镜像标签**，用于区分不同次构建；与 `pnpm docker:build` 里默认的时间戳 tag 一样，都可按需自定。不需要的本地镜像可用 `docker rmi mcp-gateway:check` 删除。

### 新增一个 MCP 服务（推荐做法）

1. 复制一份 `packages/mcp-fetch` 为 `packages/mcp-<name>`
2. 修改新包的 `package.json#name`、`src/index.ts` 里的 `name/version`
3. 在 `src/tools/` 里新增你的工具类（每个文件一个 Tool）
