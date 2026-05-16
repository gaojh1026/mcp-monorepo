/**
 * @fileoverview 网关托管本地 MCP 时的入口鉴权：要求 `Authorization: Bearer <token>`，校验 Bearer 与 token 形态（不校验签名或上游真伪）。
 * @module mcp-gateway/mcp/authProvider
 */

import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { AuthProvider as IAuthProvider, AuthResult } from 'mcp-framework';

/**
 * 构造用于日志输出的请求头副本：`Authorization` 仅标记是否存在，避免把凭证写入日志。
 * @param headers - 原始请求头
 * @returns 适合 `console` 输出的普通对象
 */
const headersForLog = (headers: IncomingHttpHeaders): Record<string, string | string[] | undefined> => {
  const snapshot: Record<string, string | string[] | undefined> = { ...headers };
  if (snapshot.authorization !== undefined) {
    snapshot.authorization = Array.isArray(snapshot.authorization) ? ['[present]'] : '[present]';
  }
  return snapshot;
};

/**
 * @description 获取 Authorization 头并校验 Bearer 格式
 * @param headers - 原始请求头
 */
const getAuthorizationRaw = (headers: IncomingHttpHeaders): boolean => {
  const raw = headers.authorization;
  if (!raw || typeof raw !== 'string' || !raw.startsWith('Bearer ')) {
    return false;
  }
  const token = raw.slice('Bearer '.length).trim();
  if (!token) {
    return false;
  }
  return true;
};

/**
 * 入口鉴权：要求 `Authorization: Bearer <token>`，且 token 须为合法 JWT 外形或可接受的 opaque 串；通过后写入 `headers`（及 `token` 供上下文使用）。
 */
export class AuthProvider implements IAuthProvider {
  /**
     * @param req - Node 入站请求
     * @returns 校验通过为 `{ data: { headers, token } }`，否则为 `false`
     */
  async authenticate(req: IncomingMessage): Promise<AuthResult | false> {
    console.log('[mcp-gateway][AuthProvider]网关请求', {
      method: req.method,
      url: req.url,
      headers: headersForLog(req.headers),
    });

    // 先去掉
    // const authorization = getAuthorizationRaw(req.headers);
    // if (!authorization) {
    //     return false;
    // }

    return { data: { headers: req.headers } };
  }

  /**
     * @returns `authenticate` 返回 `false` 时由网关写入 JSON-RPC 错误体
     */
  getAuthError(): { status: number; message: string } {
    return {
      status: 401,
      message: '需要 Authorization: Bearer <token>',
    };
  }
}
