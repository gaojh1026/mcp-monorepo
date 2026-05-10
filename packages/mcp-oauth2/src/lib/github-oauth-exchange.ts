/**
 * GitHub OAuth App：authorization code → access_token（JSON 响应）。
 */

export type GitHubTokenResponse = {
    access_token: string
    token_type: string
    scope: string
}

/**
 * 用授权码换取 access token。
 *
 * @param clientId - GitHub OAuth App Client ID
 * @param clientSecret - GitHub OAuth App Client Secret
 * @param code - 回调 URL 中的 `code`
 * @param redirectUri - 与授权请求及 GitHub App 配置完全一致的 redirect_uri
 */
export async function exchangeGitHubOAuthCode(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
): Promise<GitHubTokenResponse> {
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
    })
    const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    })
    if (!res.ok) {
        throw new Error(`GitHub token 接口 HTTP ${res.status}`)
    }
    const json = (await res.json()) as GitHubTokenResponse & {
        error?: string
        error_description?: string
    }
    if (json.error || !json.access_token) {
        throw new Error(
            json.error_description ?? json.error ?? '未返回 access_token'
        )
    }
    return json
}
