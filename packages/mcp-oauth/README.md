# 服务配置

PORT=8788
HOST=0.0.0.0
MCP_ENDPOINT=/mcp

# 日志配置（设为 false 可禁用日志）

MCP_LOGGING=true

# CORS 配置（逗号分隔的多个 Origin，未设置则不校验 Origin）

# MCP_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8788

# 上游 Nest 服务配置

NEST_OAUTH2_MY_APPS_URL=http://localhost:4000/nestjs_api/oauth2/my-apps

WelcomeMessageTool GreetingPrompt
基类
MCPTool
MCPPrompt
入口注册
server.addTool(...)
server.addPrompt(...)
在 MCP 里怎么走
tools/list → tools/call
prompts/list → prompts/get
你实现的方法
execute() → 返回 工具结果（如 { message, style }）
generateMessages() → 返回 消息列表（给宿主塞进模型对话）
典型用途
调 API、算数据、给客户端结构化结果
给模型拼「提示模板」，不是当普通 RPC 用
