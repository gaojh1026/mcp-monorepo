################################################################################
#
#   本文件产出两种镜像（多阶段构建）
#
#   ┌─────────────────────────────────────────────────────────────────────────┐
#   │ ① 默认镜像：mcp-gateway（不写 --target 时，构建流水线以「最后一个       │
#   │    FROM」为准，即文末的 runtime 阶段）                                   │
#   │    · 构建：docker build -f Dockerfile -t mcp-gateway:<TAG> .            │
#   │    · 国内：加 --build-arg NPM_REGISTRY=https://registry.npmmirror.com    │
#   │    · 运行：node packages/mcp-gateway/dist/index.js                      │
#   ├─────────────────────────────────────────────────────────────────────────┤
#   │ ② Playwright MCP：独立镜像，与网关阶段无依赖                             │
#   │    · 构建：docker build -f Dockerfile -t pw-mcp:<TAG> \                 │
#   │             --target playwright-mcp .                                    │
#   │    · 可选：--build-arg PLAYWRIGHT_BROWSERS_PATH=/ms-playwright（默认）   │
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
# 保留目录结构，匹配 packages 下任意子包；新增 mcp-* 无需再手写一行 COPY
COPY --parents common/package.json ./
COPY --parents packages/*/package.json ./
RUN corepack enable \
  && corepack prepare pnpm@8.15.8 --activate \
  && pnpm config set registry "${NPM_REGISTRY}" \
  && pnpm install --frozen-lockfile

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
# STAGE: runtime  |  mcp-gateway 默认最终阶段 | 仅复制构建产物，Alpine 体积小
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo ./
CMD ["node", "packages/mcp-gateway/dist/index.js"]
