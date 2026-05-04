# =============================================================================
# 多阶段镜像说明
# -----------------------------------------------------------------------------
# 1) 默认（不写 --target）：构建 mcp-gateway 生产镜像，入口为网关 dist。
# 2) Playwright MCP：构建时加 --target playwright-mcp，产出独立 MCP 容器镜像。
#
# 常用命令（均在仓库根目录执行）：
#   docker build -f Dockerfile -t mcp-gateway:TAG .
#   docker build -f Dockerfile -t mcp-gateway:TAG --build-arg NPM_REGISTRY=https://registry.npmmirror.com .
#   docker build -f Dockerfile -t playwright-mcp:TAG --target playwright-mcp .
#
# 可选构建参数：
#   NPM_REGISTRY              — pnpm  registry，默认 https://registry.npmjs.org
#   PLAYWRIGHT_BROWSERS_PATH  — Playwright 浏览器目录，默认 /ms-playwright
# =============================================================================

# -----------------------------------------------------------------------------
# Stage: deps — 仅复制 workspace 清单并安装依赖（利于缓存）
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /repo

ARG NPM_REGISTRY=https://registry.npmjs.org

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY common/package.json ./common/package.json
COPY packages/mcp-gateway/package.json ./packages/mcp-gateway/package.json
COPY packages/mcp-poem/package.json ./packages/mcp-poem/package.json
COPY packages/mcp-playwright/package.json ./packages/mcp-playwright/package.json

RUN corepack enable \
  && corepack prepare pnpm@8.15.8 --activate \
  && pnpm config set registry "${NPM_REGISTRY}" \
  && pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage: build — 拷贝源码并全量构建 workspace
# -----------------------------------------------------------------------------
FROM deps AS build

COPY common ./common
COPY packages ./packages

RUN pnpm -r --if-present run build

# -----------------------------------------------------------------------------
# Stage: playwright-base — @playwright/mcp 运行时依赖（生产 npm + 系统库）
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS playwright-base

ARG PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH}

WORKDIR /app

COPY packages/mcp-playwright/package.json packages/mcp-playwright/package-lock.json ./

RUN --mount=type=cache,target=/root/.npm,sharing=locked,id=npm-playwright-cache \
  npm ci --omit=dev \
  && npx -y playwright-core install-deps chromium

# -----------------------------------------------------------------------------
# Stage: playwright-mcp — 安装 Chromium 产物 + 业务入口（与网关无依赖关系）
# -----------------------------------------------------------------------------
FROM playwright-base AS playwright-mcp

ARG USERNAME=node

ENV NODE_ENV=production

RUN npx -y playwright-core install --no-shell chromium \
  && chown -R "${USERNAME}:${USERNAME}" node_modules "${PLAYWRIGHT_BROWSERS_PATH}"

USER ${USERNAME}

COPY --chown=${USERNAME}:${USERNAME} packages/mcp-playwright/cli.js packages/mcp-playwright/package.json /app/

WORKDIR /home/${USERNAME}

ENTRYPOINT ["node", "/app/cli.js", "--headless", "--browser", "chromium", "--no-sandbox"]

# -----------------------------------------------------------------------------
# Stage: runtime — mcp-gateway 默认最终阶段
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /repo

ENV NODE_ENV=production

COPY --from=build /repo ./

CMD ["node", "packages/mcp-gateway/dist/index.js"]
