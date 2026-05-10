/**
 * 使用 GitHub User API 校验 OAuth access token 并返回公开用户信息。
 */

export type GitHubPublicUser = {
    id: number
    login: string
    name: string | null
    avatar_url: string
}

/**
 * 携带 access token 请求 `GET /user`；无效或过期 token 返回 `undefined`。
 *
 * @param accessToken - GitHub OAuth access token
 */
export async function fetchGitHubUser(
    accessToken: string
): Promise<GitHubPublicUser | undefined> {
    const res = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })
    if (!res.ok) {
        return undefined
    }
    return (await res.json()) as GitHubPublicUser
}
