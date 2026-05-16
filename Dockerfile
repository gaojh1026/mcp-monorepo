################################################################################
#
#   本文件产出三种镜像目标（多阶段构建）
#
#   ┌─────────────────────────────────────────────────────────────────────────┐
#   │ ① 默认镜像：mcp-gateway（不写 --target 时，构建流水线以「最后一个       │
#   │    FROM」为准，即文末的 runtime 阶段）                                   │
#   │    · 构建：docker build -f Dockerfile -t mcp-gateway:<TAG> .            │
#   │    · 国内：加 --build-arg NPM_REGISTRY=https://registry.npmmirror.com    │
#   │    · 运行：node packages/mcp-gateway/dist/index.js                      │
#   │    · 守护：由 Docker/Compose 的 restart 策略负责（勿在镜像内叠 PM2）；   │
#   │      裸机守护见 packages/mcp-gateway/ecosystem.config.cjs              │
#   ├─────────────────────────────────────────────────────────────────────────┤
#   │ ② Playwright MCP：独立镜像，与网关阶段无依赖                             │
#   │    · 构建：docker build -f Dockerfile -t pw-mcp:<TAG> \                 │
#   │             --target playwright-mcp .                                    │
#   │    · 可选：--build-arg PLAYWRIGHT_BROWSERS_PATH=/ms-playwright（默认）   │
#   ├─────────────────────────────────────────────────────────────────────────┤
#   │ ③ Nginx 反代：独立镜像，需与 runtime 容器同网络，upstream 默认          │
#   │    mcp-gateway:8787（与网关 PORT 一致；Compose 中网关服务名须匹配）      │
#   │    · 构建：docker build -f Dockerfile -t mcp-gateway-nginx:<TAG> \      │
#   │             --target nginx-proxy .                                       │
#   │    · 修改 upstream：编辑仓库根目录 nginx.conf 后重建                     │
#   └─────────────────────────────────────────────────────────────────────────┘
#
################################################################################

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# STAGE: deps  |  mcp-gateway  |  仅复制各包 package.json + 锁文件后 pnpm install
#                不把源码 COPY 进来，改业务代码时本层缓存仍可复用
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
FROM node:22-alpine AS deps
WORKDIR /repo
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
# 保留目录结构；含 mcp-context7 等嵌套子包 package.json，否则 frozen install 与构建阶段缺 dev 依赖
COPY --parents common/package.json ./
COPY --parents packages/*/package.json ./
COPY --parents packages/mcp-context7/packages/*/package.json ./
# --ignore-scripts：deps 阶段仅复制 package.json，mcp-probe-kit 的 prepare→build→prebuild
# 会执行 sync-ui-data.ts，缺源码会失败；完整构建在下一阶段 pnpm -r run build 中进行。
RUN corepack enable \
  && corepack prepare pnpm@8.15.8 --activate \
  && pnpm config set registry "${NPM_REGISTRY}" \
  && pnpm install --frozen-lockfile --ignore-scripts

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# STAGE: build  |  mcp-gateway  |  拷贝 common/packages 后执行 workspace 构建
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
FROM deps AS build
COPY common ./common
COPY packages ./packages
RUN pnpm -r --if-present run build

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# STAGE: playwright-mcp  |  @playwright/mcp 完整镜像（npm 生产依赖 + Chromium） 额外不需要的
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
FROM node:22-bookworm-slim AS playwright-mcp
ARG PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ARG USERNAME=node
ENV NODE_ENV=production \
  PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH}
WORKDIR /app
COPY packages/mcp-playwright/package.json packages/mcp-playwright/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked,id=npm-playwright-cache \
  npm ci --omit=dev \
  && npx -y playwright-core install-deps chromium \
  && npx -y playwright-core install --no-shell chromium \
  && chown -R "${USERNAME}:${USERNAME}" node_modules "${PLAYWRIGHT_BROWSERS_PATH}"
USER ${USERNAME}
COPY --chown=${USERNAME}:${USERNAME} packages/mcp-playwright/cli.js packages/mcp-playwright/package.json /app/
WORKDIR /home/${USERNAME}
ENTRYPOINT ["node", "/app/cli.js", "--headless", "--browser", "chromium", "--no-sandbox"]

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# STAGE: nginx-proxy  |  仅 Nginx 反代至同网段中的 mcp-gateway:8787（须 --target）
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
FROM nginx:1.27-alpine AS nginx-proxy
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# STAGE: runtime  |  mcp-gateway 默认最终阶段 | 仅复制构建产物，Alpine 体积小
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo ./
CMD ["node", "packages/mcp-gateway/dist/index.js"]
