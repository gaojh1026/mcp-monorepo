/**
 * @fileoverview 网关 MCP 服务领域类型（本地 / 外部服务联合形态）。
 * @module mcp-gateway/type
 */

import type { ChildProcess } from 'node:child_process';
import type { MCPServer } from 'mcp-framework';

/**
 * 本地 MCP 服务：工具逻辑在网关进程内通过 `mcp-framework` 的 `MCPServer` 加载。
 *
 * - `basePath`：指向含 `tools` 的目录（优先 `dist`，否则 `src`；开发模式下可强制 `src`）。
 * - `sessions`：每个客户端会话对应一套 transport / sdk server 实例，由网关在连接时写入。
 */
export type LocalMcpService = {
    type: 'local';
    id: string;
    packageDir: string;
    basePath: string;
    server: MCPServer;
    sessions: Map<string, { transport: any; sdkServer: any }>;
};

/**
 * 外部 MCP：实际进程在网格外或由网关 `spawn` 拉起；网关通过 `ready` 做 TCP 就绪等待，
 * 再通过 `upstream` 将请求反代到子进程暴露的 HTTP 端点。
 *
 * `process` 在运行期由网关赋值，用于生命周期管理（非配置来源）。
 */
export type ExternalMcpService = {
    type: 'external';
    id: string;
    spawn: {
        command: string;
        args: string[];
        cwd?: string;
        env?: Record<string, string>;
        shell?: boolean;
    };
    upstream: {
        baseUrl: string;
        path: string;
    };
    ready: {
        type: 'tcp';
        host: string;
        port: number;
        timeoutMs: number;
    };
    process?: ChildProcess;
};

/** 网关可识别的单条服务：要么是同进程本地包，要么是配置驱动的外部进程。 */
export type McpService = LocalMcpService | ExternalMcpService;

/**
 * `external-services.json` 的根结构；仅使用 `externalServices` 映射。
 * 键为服务 `id`（与 URL/路由中的 id 一致），值为 spawn / upstream / ready 三块配置。
 */
export type ExternalServicesConfigFile = {
    externalServices?: Record<
        string,
        {
            spawn: {
                command: string;
                args: string[];
                cwd?: string;
                env?: Record<string, string>;
                shell?: boolean;
            };
            upstream: {
                baseUrl: string;
                path: string;
            };
            ready: {
                type: 'tcp';
                host: string;
                port: number;
                timeoutMs: number;
            };
        }
    >;
};
