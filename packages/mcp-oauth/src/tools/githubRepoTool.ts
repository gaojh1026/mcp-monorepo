import { logger, MCPTool } from 'mcp-framework'
import { z } from 'zod'

interface GitHubRepoInput {
    username: string
    repo: string
}

export class GitHubRepoTool extends MCPTool<GitHubRepoInput> {
    name = 'github_repo'
    description =
        'Get repository information for a GitHub repository,获取GitHub仓库的信息'

    schema = {
        username: {
            type: z.string(),
            description: 'GitHub username'
        },
        repo: {
            type: z.string(),
            description: 'Repository name'
        }
    }

    /**
     * 构建访问 GitHub REST API 的请求头；在请求时读取环境变量，确保入口已加载 `load-env`。
     */
    private githubHeaders(): Record<string, string> {
        const raw = process.env.GITHUB_TOKEN
        const token =
            typeof raw === 'string'
                ? raw.trim().replace(/^['"]|['"]$/g, '')
                : ''
        if (!token) {
            throw new Error(
                '未配置 GITHUB_TOKEN：在 packages/mcp-oauth/.env 中设置 GITHUB_TOKEN，或使用 fine-grained PAT（需含仓库 Metadata 只读或 Contents 等权限）。'
            )
        }
        return {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json'
        }
    }

    private headers = {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
    }

    async execute(input: GitHubRepoInput) {
        const { username, repo } = input
        try {
            logger.info(`Fetching repo info for ${username}/${repo}`)
            // 使用全局 fetch：MCPTool.fetch 在成功时直接返回 JSON 而非 Response，无法做状态码分支。
            const response = await fetch(
                `https://api.github.com/repos/${username}/${repo}`,
                // { headers: this.githubHeaders() }
                { headers: this.headers }
            )

            if (!response.ok) {
                const hint =
                    response.status === 401
                        ? '（401：token 无效、过期或权限不足）'
                        : ''
                throw new Error(`GitHub API Error: ${response.status}${hint}`)
            }

            const data = (await response.json()) as {
                stargazers_count: number
                forks_count: number
                watchers_count: number
                open_issues_count: number
                html_url: string
                description: string | null
                language: string | null
                topics: string[]
            }

            return {
                stars: data.stargazers_count,
                forks: data.forks_count,
                watchers: data.watchers_count,
                openIssues: data.open_issues_count,
                url: data.html_url,
                description: data.description,
                language: data.language,
                topics: data.topics
            }
        } catch (error: unknown) {
            throw new Error(
                `Failed to fetch repo data: ${(error as Error).message}`
            )
        }
    }
}
