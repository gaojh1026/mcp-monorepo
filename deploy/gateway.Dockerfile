FROM node:22-alpine AS base

WORKDIR /repo

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY common ./common
COPY packages ./packages

RUN corepack enable && pnpm install --frozen-lockfile=false

RUN pnpm -r --if-present run build

ENV NODE_ENV=production
CMD ["pnpm", "-C", "packages/mcp-gateway", "start"]

