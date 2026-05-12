# mcp-oauth2

GitHub OAuth2 MCP 服务，支持自动登录认证。

## 功能特性

- **Device Code Flow**: GitHub 官方推荐的 CLI 认证方式
- **自动 Token 管理**: 认证后 token 自动保存，后续调用无需手动传入
- **静默认证**: 重新连接时自动使用已保存的 token

## 快速开始

### 1. 配置环境变量

创建 `.env` 文件或设置环境变量：

```bash
GITHUB_CLIENT_ID='your_github_client_id'
GITHUB_CLIENT_SECRET='your_github_client_secret'
GITHUB_OAUTH_REDIRECT_URI='http://localhost:8788/oauth/github/callback'
```

> 注意：`GITHUB_CLIENT_SECRET` 仅用于 Web OAuth 流程，Device Code Flow 只需要 `CLIENT_ID`。

### 2. 创庺 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写信息：
   - Application name: `MCP OAuth2`
   - Homepage URL: `http://localhost:8788`
   - Authorization callback URL: `http://localhost:8788/oauth/github/callback`
4. 注册后获取 `Client ID`

### 3. 启动服务

```bash
pnpm install
pnpm dev
```

服务启动后输出：
```
MCP (GitHub Bearer 鉴权) http://0.0.0.0:8788/mcp
```

## 使用方式

### 方式一：Device Code Flow（推荐）

只需两步即可完成认证：

**步骤 1：发起登录**
```json
{
  "tool": "github_device_login"
}
```
返回：
```json
{
  "success": true,
  "user_code": "ABCD-1234",
  "verification_uri": "https://github.com/login/device",
  "message": "请在浏览器中打开 https://github.com/login/device 并输入代码: ABCD-1234"
}
```

**步骤 2：等待授权**
```json
{
  "tool": "github_device_poll",
  "parameters": {
    "device_code": "从步骤1获取的device_code"
  }
}
```

此时在浏览器中：
1. 打开 https://github.com/login/device
2. 输入显示的用户代码
3. 点击授权

授权成功后返回：
```json
{
  "success": true,
  "message": "GitHub 授权成功！Token 已保存，可直接调用其他工具。",
  "token_saved": true
}
```

### 方式二：检查认证状态

```json
{
  "tool": "github_auth_status"
}
```

### 方式三：直接调用（需手动传入 token）

```json
{
  "tool": "github_whoami",
  "headers": {
    "Authorization": "Bearer gho_xxxxx"
  }
}
```

## 可用工具

| 工具名称 | 描述 |
|---------|------|
| `github_auth_status` | 检查认证状态，返回当前登录用户信息 |
| `github_device_login` | 发起 Device Code 登录，获取用户代码 |
| `github_device_poll` | 轮询等待授权完成 |
| `github_whoami` | 返回当前登录的 GitHub 用户信息 |

## 自动认证机制

1. 首次使用时调用 `github_device_login` 完成 OAuth 授权
2. 获得的 token 自动保存到 `~/.config/mcp-oauth2/github-token.json`
3. 后续调用时，MCP 自动使用保存的 token，无需手动传入
4. 如果 token 过期或失效，`github_whoami` 会提示重新授权

## 环境变量

| 变量名 | 必填 | 默认值 | 描述 |
|-------|-----|-------|------|
| `GITHUB_CLIENT_ID` | 是 | - | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | 否 | - | GitHub OAuth App Client Secret（Web OAuth 流程需要） |
| `GITHUB_OAUTH_REDIRECT_URI` | 否 | `http://localhost:8788/oauth/github/callback` | OAuth 回调 URL |
| `PORT` | 否 | `8788` | MCP 服务端口 |
| `HOST` | 否 | `0.0.0.0` | MCP 服务监听地址 |
| `MCP_ENDPOINT` | 否 | `/mcp` | MCP 端点路径 |

## MCP 客户端配置

### Claude Code / Codex 配置示例

```json
{
  "mcpServers": {
    "github": {
      "url": "http://localhost:8788/mcp",
      "headers": {
        "Authorization": "Bearer <your_token>"
      }
    }
  }
}
```

### 自动认证模式

如果已通过 Device Code Flow 完成授权，可以省略 `Authorization` 头，MCP 会自动使用保存的 token：

```json
{
  "mcpServers": {
    "github": {
      "url": "http://localhost:8788/mcp"
    }
  }
}
```
