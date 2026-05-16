# Vue SSO 项目

## 项目概述

Vue SSO 是一个基于 Vue 3 + TypeScript 的单点登录系统，支持用户注册、登录、GitHub OAuth 登录以及 OAuth2.0 应用注册功能。

## 主要功能

### 1. 用户认证系统

#### 登录功能

- 邮箱密码登录
- 验证码验证
- 表单验证
- 登录状态持久化

#### 注册功能

- 用户名、邮箱、密码注册
- 密码确认验证
- 邮箱格式验证
- 验证码验证

#### GitHub OAuth 登录

- 支持 GitHub 第三方登录
- 安全的 OAuth 流程
- 自动用户创建/关联

### 2. OAuth2.0 应用注册功能

#### 功能说明

本项目包含一个完整的OAuth2.0应用注册表单，用于第三方应用的备案注册。

#### 表单字段

根据数据库表 `oauth2` 的字段设计，表单包含以下字段：

- **应用名称** (app_name): 必填，最大100字符
- **回调地址** (redirect_uris): 必填，支持多个地址用逗号分隔
- **应用所有者ID** (owner_id): 必填，数字类型
- **允许的Scope** (scope): 可选，最大255字符，多个用空格分隔
- **应用描述** (description): 可选，最大500字符
- **应用主页** (homepage_url): 可选，最大255字符，必须是有效的URL
- **应用状态** (status): 必填，0-禁用，1-启用

#### 自动生成字段

以下字段由后端接口自动生成，用户无需填写：

- **应用ID** (client_id): 自动生成的唯一标识
- **应用密钥** (client_secret): 自动生成的安全密钥

#### 表单验证

- 应用名称：必填，长度1-100字符
- 回调地址：必填，必须是有效的URL格式，支持多个地址
- 应用所有者ID：必填，必须大于0的数字
- 应用主页：可选，但必须是有效的URL格式
- Scope和描述：可选，但有长度限制

#### 注册流程

1. 用户填写表单信息
2. 前端进行表单验证
3. 提交到后端API `/oauth2/register`
4. 后端自动生成client_id和client_secret
5. 返回完整的应用信息
6. 前端展示注册结果，包含重要的Client ID和Client Secret

#### 安全提示

- Client Secret只在注册成功时显示一次
- 建议用户立即复制并安全保存Client Secret
- 如需修改应用信息，请联系管理员

## 技术栈

- Vue 3 + TypeScript
- Ant Design Vue
- Axios
- Less
- Pinia (状态管理)
- Vue Router

## 开发说明

### 环境要求

- Node.js >= 16
- npm 或 pnpm

### 安装和运行

1. 安装依赖：

    ```bash
    npm install
    # 或
    pnpm install
    ```

2. 配置环境变量：
   在项目根目录创建 `.env` 文件：

    ```bash
    # API配置
    VITE_API_URL=http://localhost:3000

    # GitHub OAuth配置（可选）
    VITE_GITHUB_CLIENT_ID=your-github-client-id
    VITE_GITHUB_CLIENT_SECRET=your-github-client-secret
    ```

3. 启动开发服务器：

    ```bash
    npm run dev
    # 或
    pnpm dev
    ```

4. 访问应用：
    - 登录页面：`/login-page`
    - 应用注册页面：`/app-register`
    - 首页：`/home`

### GitHub OAuth 配置

详细的 GitHub OAuth 配置说明请参考：[GITHUB_OAUTH_README.md](./GITHUB_OAUTH_README.md)

## API接口

### 用户认证接口

#### 登录接口

```typescript
POST /auths/login
Content-Type: application/json

// 请求参数
{
  "email": "string",
  "password": "string",
  "captcha": "string",
  "captchaId": "string"
}

// 响应数据
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "string",
    "data": {
      "id": number,
      "username": "string",
      "email": "string"
    }
  }
}
```

#### 注册接口

```typescript
POST /auths/register
Content-Type: application/json

// 请求参数
{
  "username": "string",
  "email": "string",
  "password": "string",
  "captcha": "string",
  "captchaId": "string"
}

// 响应数据
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "string",
    "data": {
      "id": number,
      "username": "string",
      "email": "string"
    }
  }
}
```

#### GitHub登录接口

```typescript
POST /auths/github
Content-Type: application/json

// 请求参数
{
  "code": "string" // GitHub授权码
}

// 响应数据
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "string",
    "data": {
      "id": number,
      "username": "string",
      "email": "string"
    }
  }
}
```

#### 验证码接口

```typescript
GET /auths/captcha

// 响应数据
{
  "code": 0,
  "message": "success",
  "data": {
    "captcha_id": "string",
    "captcha_image": "string" // SVG格式的验证码图片
  }
}
```

### OAuth2.0 应用注册接口

```typescript
// 注册接口
POST /oauth2/register
Content-Type: application/json

// 请求参数
{
  "app_name": "string",
  "redirect_uris": "string",
  "owner_id": number,
  "scope": "string?",
  "description": "string?",
  "homepage_url": "string?",
  "status": number?
}

// 响应数据
{
  "code": 0,
  "message": "success",
  "data": {
    "id": number,
    "app_name": "string",
    "client_id": "string",
    "client_secret": "string",
    "redirect_uris": "string",
    "owner_id": number,
    "scope": "string?",
    "description": "string?",
    "homepage_url": "string?",
    "status": number,
    "created_at": "string",
    "updated_at": "string"
  }
}
```

## 项目结构

```
src/
├── components/          # 公共组件
├── views/              # 页面组件
│   ├── login-page/     # 登录注册页面
│   ├── github-callback/ # GitHub回调页面
│   ├── app-register/   # 应用注册页面
│   ├── sso-center/     # SSO授权中心
│   └── HomeView.vue    # 首页
├── stores/             # Pinia状态管理
├── service/            # API服务
├── types/              # TypeScript类型定义
├── utils/              # 工具函数
└── router/             # 路由配置
```

## 安全特性

- JWT Token 认证
- 验证码防护
- CSRF 防护（GitHub OAuth）
- 密码强度验证
- 表单验证
- 路由守卫

## 部署说明

1. 构建生产版本：

    ```bash
    npm run build
    ```

2. 配置生产环境变量
3. 部署到 Web 服务器
4. 配置 HTTPS（生产环境必需）

## 相关文档

- [认证系统说明](./AUTH_README.md)
- [GitHub OAuth 配置](./GITHUB_OAUTH_README.md)
- [Pinia 持久化说明](./PINIA_PERSIST_README.md)
