/**
 * 在其它模块读取 `process.env` 之前加载包根目录下的 `.env`。
 * 避免从仓库根目录启动时仅依赖 `process.cwd()` 找不到 `packages/mcp-oauth/.env`。
 */
import { config } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })
