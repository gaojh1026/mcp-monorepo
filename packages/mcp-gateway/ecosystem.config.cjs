/**
 * @fileoverview PM2 单机进程守护：崩溃自重启、日志与可控退出窗口。
 * 默认单实例 fork；勿改为 cluster——会话与子进程与单 Node 进程绑定。
 * 使用前在仓库根执行构建，且需已安装 PM2（如 `npm i -g pm2`）。
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
    apps: [
        {
            name: 'mcp-gateway',
            script: 'dist/index.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            max_restarts: 15,
            min_uptime: '10s',
            /** 与入口 `server.close` 对齐，避免滚动/重启时硬杀 */
            kill_timeout: 10_000,
            /** 拉起外部 MCP、等 TCP 就绪可能较慢 */
            listen_timeout: 120_000,
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
}
