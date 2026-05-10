/**
 * MCP-OAuth 上游请求工具模块
 *
 * 提供与 MCP 请求上下文集成的 HTTP 请求功能，
 * 便于在 MCP 工具中向上游服务发起经过认证的请求。
 */

import { getRequestContext } from 'mcp-framework'

/**
 * 获取当前 MCP 请求上下文中的 Bearer access token
 *
 * 当 MCP 入口使用 {@link BearerIngressAuthProvider}（或框架 `OAuthAuthProvider` 等会写入 `token` 的鉴权）时，
 * 框架会把 token 放进请求上下文；本函数从上下文中取出原始字符串。
 *
 * @returns Bearer token 字符串，若不存在则返回 undefined
 */
export function getRequestAccessToken(): string | undefined {
    const ctx = getRequestContext()
    const token = ctx?.token
    return typeof token === 'string' && token.length > 0 ? token : undefined
}

/**
 * 使用 MCP 请求上下文的 Bearer token 发起 HTTP 请求
 *
 * 自动将当前 MCP 请求的 access token 添加到 `Authorization` 头中，
 * 适用于需要向上游服务（如 NestJS API）进行认证请求的场景。
 *
 * @param input - `fetch` 函数的 URL 或 Request 对象
 * @param init - `fetch` 函数的可选配置（headers、method 等）
 * @returns 上游服务的 HTTP 响应
 * @throws 若上下文中无 Bearer token（例如客户端未带 `Authorization: Bearer`）
 *
 * @example
 * ```typescript
 * // 调用上游 NestJS OAuth2 API
 * const response = await fetchWithMcpRequestAuthorization(
 *   'http://localhost:4000/nestjs_api/oauth2/my-apps'
 * );
 * ```
 */
export async function fetchWithMcpRequestAuthorization(
    input: Parameters<typeof fetch>[0],
    init?: RequestInit
): Promise<Response> {
    const token = getRequestAccessToken()
    if (!token) {
        throw new Error(
            '无 Bearer：请在 MCP 客户端连接本服务时配置 Authorization: Bearer <token>（与调 Nest 使用同一 token）。'
        )
    }
    const headers = new Headers(init?.headers ?? undefined)
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(input, { ...init, headers })
}
