/**
 * @fileoverview 运行时常量与仓库根路径（环境变量 + monorepo 探测）
 * @module mcp-gateway/lib/runtime
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * HTTP 服务器端口，默认为 8787（环境变量 PORT）
 */
export const port = Number(process.env.PORT ?? 8787)

/**
 * HTTP 监听地址，默认 0.0.0.0（环境变量 HOST）
 */
export const host = process.env.HOST ?? '0.0.0.0'

/**
 * 请求体最大字节数，默认 4MB（环境变量 MAX_BODY_BYTES）
 */
export const MAX_BODY_BYTES = Number(
    process.env.MAX_BODY_BYTES ?? 4 * 1024 * 1024
)

/**
 * 向上查找带 `pnpm-workspace.yaml` 的 monorepo 根目录
 * @param startDir - 起始目录，一般为 `process.cwd()`
 */
export const findRepoRoot = (startDir: string) => {
    let current = resolve(startDir)
    for (let i = 0; i < 10; i++) {
        if (existsSync(resolve(current, 'pnpm-workspace.yaml'))) return current
        const parent = dirname(current)
        if (parent === current) break
        current = parent
    }
    return startDir
}
