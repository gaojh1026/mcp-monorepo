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

2. 启动所有有 `dev` 脚本的服务（**并行**跑各个 workspace 包里的 `dev`）：

```bash
pnpm dev
```

当前仓库里声明了 `dev` 的包会一起启动（子包未定义 `dev` 则跳过）：例如 `@mcp/gateway` 默认 `8787`、`@mcp/poem` 默认 `8788`。若只想跑其中一个，用 `pnpm -C packages/<包目录> dev`（见下文「单包开发」）。

### 根目录脚本（`package.json`）

在仓库根目录执行，含义如下。

| 脚本 | 作用 |
|------|------|
| `pnpm dev` | `pnpm -r --parallel --if-present run dev`：对所有 workspace 递归执行 `dev`（有则执行、无则跳过），**多进程并行**。适合本地同时开发网关 + 各 MCP 子服务。 |
| `pnpm start` | `pnpm -r --parallel --if-present run start`：并行执行各包 `start`（一般为 `node dist/...`）。**需先**在各包或根目录执行过 `pnpm build`，否则可能缺少 `dist`。 |
| `pnpm start:gateway` | 先 `pnpm stop`（释放占用 **8787** 的进程），再**仅**构建并启动 `packages/mcp-gateway`（`build` → `start`）。适合只要网关、或生产式本地验证网关一条链。 |
| `pnpm stop` | 查找占用 **8787** 端口的进程并 `kill -9`（网关默认端口），等价于根目录里对 `lsof` / `xargs` 的一行封装。 |
| `pnpm build` | `pnpm -r --parallel --if-present run build`：并行执行各包 `build`（本仓库里多为 `tsc` 编译到 `dist`；个别包可能是占位脚本）。**构建阶段在 CI / 发布 / Docker 里主要跑的就是这一类编译**。 |
| `pnpm preview` | 并行执行各包 `preview`（若存在）。当前子包若未定义 `preview`，则不会报错（`--if-present`）。 |
| `pnpm collect` | 执行 `scripts/collect-builds.sh`：清空或按需清理根目录 `dist/`，再把各 `packages/mcp-*` 下的 `dist` 聚合拷贝到根目录 `dist/<包名>/`，便于统一部署产物。 |
| `pnpm clean` | 执行 `scripts/clean-builds.sh`：删除根目录 `dist` 以及各包下的 `dist` 目录。 |
| `pnpm lint` | 全仓库 ESLint。 |
| `pnpm format` | Prettier 写回格式化；`pnpm format:check` 为只检查不修改。 |
| `pnpm lint-staged` | 运行 `lint-staged`（通常配合 git hooks）。 |
| `pnpm docker:build` | 根目录 `Dockerfile` 构建默认阶段（网关镜像），`TAG` 未设时用时间戳；依赖走镜像内默认 npm registry。 |
| `pnpm docker:build:mirror` | 同上，但传入 `NPM_REGISTRY=npmmirror`，适合国内网络构建。 |
| `pnpm test` | 根目录占位脚本（未接 workspace 测试）；子包如有自己的 `test` 请在对应目录执行，例如 `pnpm -C packages/mcp-poem test`。 |

**开发阶段**：日常改代码用 `pnpm dev` 或只跑某个包 `pnpm -C packages/mcp-gateway dev` 等；需要模拟生产进程时用 `pnpm build` 后 `pnpm start` 或 `pnpm start:gateway`。

**构建阶段**：以 `pnpm build` 为主；若要把各 `mcp-*` 的 `dist` 收到一处，再执行 `pnpm collect`。发布/镜像构建流程里通常包含 `install` → `build`（根 `Dockerfile` 内也是类似顺序）。

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

### @mcp/gateway 架构与流程

网关进程做三件事：**启动时汇总「有哪些 MCP 服务」**、**对外暴露一套 HTTP（含 CORS）**、**把 `/<serviceId>/mcp` 交给本进程内的 `mcp-framework`（本地服务）或原样反代到外部上游（外部服务）**。

#### 包内目录结构（`packages/mcp-gateway/src`）

| 路径 | 说明 |
|------|------|
| `index.ts` | 入口：解析仓库根、加载可选 `.env`、`loadServices`、拉起外部依赖进程、`createGatewayHttpServer`、`listen` |
| `lib/runtime.ts` | `PORT` / `HOST` / `MAX_BODY_BYTES`，以及通过 `pnpm-workspace.yaml` 向上查找 monorepo 根目录 |
| `lib/dotenv.ts` | 启动时可选加载仓库根与 `packages/mcp-gateway` 下的 `.env`（不覆盖已有环境变量） |
| `lib/http.ts` | JSON body 读取、CORS、JSON-RPC 错误、`req.url` 临时改为 `/mcp` 以适配 SDK、解析 `/{serviceId}/mcp` 路径 |
| `modules/services/registry.ts` | 扫描 `packages/mcp-*`（排除 `mcp-gateway`）构建 `MCPServer`，并合并 `mcp-gateway.external-services.json` |
| `modules/services/external.ts` | 外部服务：TCP 端口探测、按需 `spawn`、等待就绪、HTTP(S) 反向代理 |
| `modules/services/panelHtml.ts` | `GET /services` 内嵌的管理页 HTML |
| `modules/gateway/httpServer.ts` | `http.Server`：OPTIONS、`/health`、`/services`、`/{id}/mcp` 路由与本地 MCP Streamable HTTP 会话 |

#### 启动阶段（顺序）

1. **`findRepoRoot`**：从 `process.cwd()` 向上查找含 `pnpm-workspace.yaml` 的目录作为仓库根。
2. **`loadOptionalEnvFiles(repoRoot)`**（若存在）：读取根目录与 `packages/mcp-gateway` 下的 `.env`，合并进 `process.env`（不覆盖已有变量）。
3. **`loadServices(repoRoot)`**：在 `packages/` 下遍历 `mcp-*` 目录；若存在 `dist/tools` 或 `src/tools`（或开发模式下 `MCP_GATEWAY_DEV=1` 强制用 `src`），则为该包创建 `MCPServer` 并尽量预初始化；再读取 `packages/mcp-gateway/mcp-gateway.external-services.json`，将其中声明的 **external** 服务合并进同一个 `Map<serviceId, McpService>`（同名 **external 会覆盖** 已扫描到的本地服务）。
4. **`ensureExternalServicesStarted`**：对每个 `type === 'external'` 的项，若 ready 端口暂不可连则按配置 **spawn** 子进程，再 **轮询 TCP** 直到就绪或超时。
5. **`createGatewayHttpServer(services)`** + **`listen(port, host)`**：开始接受 HTTP。

#### HTTP 路由与 MCP 会话（运行时）

对普通请求（先处理 `OPTIONS` 预检并带 CORS）大致顺序为：

1. **`GET /health`**：返回 JSON，含 `ok` 与当前已注册的 `services`（所有 `serviceId` 列表）。
2. **`GET /services`**：返回内嵌管理页，便于在浏览器里查看列表、探测 `/{id}/mcp`、做初始化与工具调用测试。
3. **路径不是 `/{serviceId}/mcp`**：返回 `404 Not Found`。
4. **`serviceId` 不在 Map 中**：`404 Service Not Found`。
5. **服务为 `external`**：**反向代理**到配置的 `upstream.baseUrl` + `upstream.path`，请求体与流式响应透传，并补全 CORS 相关响应头。
6. **服务为 `local`（本进程 MCP）**：
   - 将对外路径 **`/{serviceId}/mcp`** 临时改写为 **`/mcp`** 后交给 `@modelcontextprotocol/sdk` 的 **`StreamableHTTPServerTransport`**（与 SDK 默认端点一致）。
   - **POST** 会读取 JSON body（受 **`MAX_BODY_BYTES`** 限制）。
   - 若请求头带有已在内存 **`sessions`** 里登记的 **`mcp-session-id`**：复用该会话的 **transport** 处理本次 JSON-RPC。
   - 若无 session 但 body 为 **`initialize`**（或 session 已失效但再次 **initialize**）：新建 transport 与 `createSDKServerForSession()`，在会话初始化回调里写入 **`sessions`**；连接关闭时清理 session 并关闭 SDK server。
   - 无合法 session 且非初始化：返回 **400**（无 session）；有 session 但找不到：返回 **404 Session not found**（JSON-RPC 包装）。

总览（启动 + 一次 MCP 路径请求）：

```mermaid
flowchart TB
  subgraph boot [启动]
    A[findRepoRoot] --> A2[loadOptionalEnvFiles]
    A2 --> B[loadServices 扫描包 + 外部 JSON]
    B --> C[ensureExternalServicesStarted]
    C --> D[listen HTTP]
  end
  subgraph req [请求]
    D --> E{路径}
    E -->|/health| F[返回服务列表 JSON]
    E -->|/services| G[返回管理页 HTML]
    E -->|/{id}/mcp| H{服务类型}
    H -->|external| I[反代到 upstream]
    H -->|local| J{session / initialize}
    J -->|已有 session| K[transport.handleRequest]
    J -->|initialize| L[新建 transport + sdkServer 写入 sessions]
    J -->|否则| M[400 / 404 JSON-RPC]
  end
```

#### 本地服务与外部服务

| 类型 | 注册方式 | 运行时行为 |
|------|----------|------------|
| **local** | 自动发现 `packages/mcp-*`（排除网关包），同进程 **`MCPServer`** | 按 MCP Streamable HTTP 管理 **session** 与工具调用 |
| **external** | 仅来自 **`mcp-gateway.external-services.json`** | 网关负责 **进程与端口就绪**（可选 spawn）+ **HTTP 反代**；不在网关进程内加载 `mcp-framework` |

#### 相关文件与环境变量

- **外部服务清单**：`packages/mcp-gateway/mcp-gateway.external-services.json`（可选；不存在则仅本地扫描结果）。
- **可选 `.env`**：网关启动时会读取仓库根目录 **`.env`** 与 **`packages/mcp-gateway/.env`**，合并进 `process.env`（**不覆盖**已在 shell 中设置的变量），便于配置 `FIRECRAWL_API_KEY` 等；二者已在 **`.gitignore`** 中忽略，**切勿将密钥提交进 Git**。
- **`PORT` / `HOST`**：网关监听（默认 `8787`、`0.0.0.0`）。
- **`MAX_BODY_BYTES`**：POST JSON body 上限（默认约 4MB）。
- **`MCP_GATEWAY_DEV=1`**：开发时若本地包尚无 `dist/tools`，可强制用 **`src`** 作为 `MCPServer` 的 `basePath`（见 `registry` 内 `pickBasePath` 逻辑）。

### 将第三方 MCP 适配为网关（流程总结）

把「现成的 / 开源的」MCP 项目接进本仓库网关时，按下面顺序做即可。本仓库 **`mcp-firecrawl`** 即按该流程以外部服务方式接入，可作为对照。

#### 1. 选择接入形态：本地包还是外部进程

| 形态 | 适用情况 | 路由 |
|------|----------|------|
| **local（自动发现）** | 包内使用 **`mcp-framework`**，且存在 **`src/tools`** 或 **`dist/tools`**（开发可加 `MCP_GATEWAY_DEV=1` 走 `src`） | `http(s)://<网关>/<id>/mcp`，`<id>` = 目录名去掉前缀 `mcp-`（如 `mcp-poem` → `poem`） |
| **external（配置驱动）** | 独立进程、其它框架（如 **FastMCP**）、默认仅 **stdio**、或不便改成 `tools` 目录结构 | 同上，由 **`mcp-gateway.external-services.json`** 注册同名 `id` |

若 `packages/mcp-*` 里已有一个本地包，又与 **external** 配置了**相同 `id`**，以外部配置为准（会覆盖本地同名项，见 `registry` 日志警告）。

#### 2. 外部服务：子进程必须提供 Streamable HTTP（或等价 HTTP MCP）

网关对外统一是 **`/{serviceId}/mcp`**；对 **external** 则把请求**反代**到 `upstream.baseUrl` + `upstream.path`。

- 子进程必须在某 **TCP 端口** 上监听，且 MCP 路径一般为 **`/mcp`**（以该上游实现为准）。
- 若上游默认只有 **stdio**，需按其文档打开 **HTTP / Streamable HTTP** 等模式。示例（本仓库 **firecrawl**）：设置 **`HTTP_STREAMABLE_SERVER=true`**，并用 **`PORT` / `HOST`** 指定监听地址；编译入口一般为 **`node dist/index.js`**。

#### 3. 编辑 `packages/mcp-gateway/mcp-gateway.external-services.json`

在根对象的 **`externalServices`** 下增加一项，键名为 URL 中的 **`serviceId`**，值为：

- **`spawn`**（可选但常用）：`command`、`args`、`cwd`（相对 **`packages/mcp-gateway`** 时常用 `../mcp-<子包名>`）、`env`（仅子进程额外变量）。
- **`upstream`**：`baseUrl`（如 `http://127.0.0.1:8940`）与 **`path`**（一般为 **`/mcp`**）。
- **`ready`**：`type: "tcp"`、`host`、`port`、`timeoutMs`；若启动时端口未监听，网关会先 **spawn** 再轮询直至端口可连。

**环境变量合并**：`external.ts` 里子进程环境为 **`{ ...process.env, ...spawn.env }`**，因此写在仓库 **`.env`** / **`packages/mcp-gateway/.env`** 或 shell 里 **`export`** 的 `FIRECRAWL_API_KEY`、`FIRECRAWL_API_URL` 等会一并传入子进程，无需全部写进 JSON。

#### 4. 本机地址与网络约定

建议 **`upstream` / `ready.host` / 子进程 `HOST`** 与你在客户端里写的地址一致，优先使用 **`127.0.0.1`**，避免 **`localhost`** 在 IPv4 / IPv6 下解析不一致导致反代 **502**。

#### 5. CORS 与自定义请求头

若 Cursor 或浏览器需要在预检里声明额外头（例如 **`x-firecrawl-api-key`**），在网关 **`packages/mcp-gateway/src/lib/http.ts`** 与 **`modules/services/external.ts`** 中，为 **`Access-Control-Allow-Headers`** 按需追加，与现有项并列维护即可。

#### 6. 子进程健壮性（建议在上游包内修改）

鉴权或配置错误时，应 **`throw` 可序列化错误**返回给 MCP 客户端，**避免 `process.exit`**：否则一次失败请求会结束整个子进程，端口不再监听，网关持续 **502**，客户端表现为**看不到工具**。

#### 7. 验证与客户端配置

1. 若有健康检查：`curl http://127.0.0.1:<子进程端口>/health`（以该服务为准）。
2. **`GET http://<网关主机>:<网关端口>/health`**：确认返回的 **`services`** 数组中含对应 **`serviceId`**。
3. **Cursor**：在 **`~/.cursor/mcp.json`** 或项目 **`.cursor/mcp.json`** 中配置 **`type": "streamable_http"`** 与 **`url": "http://127.0.0.1:<网关端口>/<serviceId>/mcp"`**；保存后重载 MCP 或重启 Cursor。详见上文「给别人用的配置示例」。

#### 8. 可选：为子包增加本地调试脚本

在第三方包 **`package.json`** 中可增加 **`dev`** / **`start:http`** 等脚本，固定 **Streamable HTTP** 与端口，便于**不经过网关**单独起进程调试；网关侧 **`ready.port`** 已占用时不会重复 **spawn**，可与手动启动并存。

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
