/**
 * @fileoverview 可选 `.env` 加载：在拉起外部 MCP 子进程前注入 `process.env`（不覆盖已有变量）
 * @module mcp-gateway/lib/dotenv
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 解析单行 `KEY=VALUE`，忽略注释与空行；支持可选双引号包裹值。
 * @param line - 原始行文本
 * @returns 解析出的键值或 `null`
 */
const parseEnvLine = (line: string): { key: string; value: string } | null => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return null
    const eq = t.indexOf('=')
    if (eq <= 0) return null
    const key = t.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null
    let value = t.slice(eq + 1).trim()
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1)
    }
    return { key, value }
}

/**
 * 将多行 `.env` 内容写入 `process.env`（仅当对应键尚未定义时）。
 * @param raw - 文件全文
 */
const applyDotenvContent = (raw: string) => {
    for (const line of raw.split(/\r?\n/)) {
        const parsed = parseEnvLine(line)
        if (!parsed) continue
        if (process.env[parsed.key] === undefined) {
            process.env[parsed.key] = parsed.value
        }
    }
}

/**
 * 依次读取 monorepo 根 `.env` 与 `packages/mcp-gateway/.env`，合并进当前进程环境。
 * 已存在于 `process.env` 的键（例如 shell 已 export）不会被覆盖。
 *
 * @param repoRoot - 含 `pnpm-workspace.yaml` 的仓库根目录
 */
export const loadOptionalEnvFiles = (repoRoot: string) => {
    const paths = [
        resolve(repoRoot, '.env'),
        resolve(repoRoot, 'packages', 'mcp-gateway', '.env')
    ]
    for (const p of paths) {
        if (!existsSync(p)) continue
        try {
            applyDotenvContent(readFileSync(p, 'utf8'))
        } catch (err) {
            console.warn(`[mcp-gateway] skip reading env file ${p}:`, err)
        }
    }
}
