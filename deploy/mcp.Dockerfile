FROM node:22-alpine AS base

WORKDIR /repo

ARG PACKAGE_PATH

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY common ./common
COPY packages ./packages

RUN corepack enable && pnpm install --frozen-lockfile=false

WORKDIR /repo/${PACKAGE_PATH}
RUN pnpm run build

ENV NODE_ENV=production
CMD ["pnpm", "start"]

