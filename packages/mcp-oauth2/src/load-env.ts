/**
 * 在其它模块读取 `process.env` 之前加载包根目录下的 `.env`。
 */
import { config } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })
