FROM node:22-alpine AS deps

WORKDIR /repo

ARG NPM_REGISTRY=https://registry.npmjs.org

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY common/package.json ./common/package.json
COPY packages/mcp-gateway/package.json ./packages/mcp-gateway/package.json
COPY packages/mcp-fetch/package.json ./packages/mcp-fetch/package.json
COPY packages/mcp-poem/package.json ./packages/mcp-poem/package.json

RUN corepack enable \
  && corepack prepare pnpm@8.15.8 --activate \
  && pnpm config set registry ${NPM_REGISTRY} \
  && pnpm install --frozen-lockfile

FROM deps AS build

COPY common ./common
COPY packages ./packages

RUN pnpm -r --if-present run build

FROM node:22-alpine AS runtime

WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo ./

CMD ["node", "packages/mcp-gateway/dist/index.js"]

