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
