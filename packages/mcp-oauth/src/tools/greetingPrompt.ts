/**
 * MCP **Prompt**（`MCPPrompt`）示例：欢迎语模板
 *
 * - **注册方式**：在入口使用 `server.addPrompt(GreetingPrompt)`（`MCPServer.addPrompt`）；**不要**使用 `addTool`，否则进入 `toolsMap` 后启动阶段会对其实例调用 `injectServer`（Prompt 无此方法，会报错）。
 * - **协议侧**：出现在 `prompts/list` 中，由客户端走 `prompts/get`；返回 **GetPrompt 的 messages**，用于宿主把内容注入大模型对话，而非「工具执行的一次性 JSON 结果」。
 * - **与 `WelcomeMessageTool` 的对照**：`./welcomeMessageTool.ts` 为 `MCPTool` + `addTool`，`execute()` 返回 `{ message, style }`；本类实现 `generateMessages()`（框架经 `getMessages` 做 Zod 校验后调用），返回 `role` + `content` 的消息数组。
 *
 * @see 入口 `index.ts` 中 `addTool` / `addPrompt` 分段注释
 */

import { MCPPrompt, type PromptArgumentSchema } from 'mcp-framework'
import { z } from 'zod'

interface GreetingPromptInput {
    name: string
    style: 'warm' | 'formal'
}

export class GreetingPrompt extends MCPPrompt<GreetingPromptInput> {
    name = 'greeting_prompt'
    description = 'Generate a personalized greeting message (using MCPPrompt)'

    /** 使用 `.default()` 时 Zod 的 input 含 `undefined`，与 `PromptArgumentSchema<T>` 的字段类型推导冲突，此处对整体做断言以通过校验并保持运行时行为不变。 */
    schema = {
        name: {
            type: z.string().trim().min(1).max(30).default('朋友'),
            description: 'Name of the user',
            required: true
        },
        style: {
            type: z.enum(['warm', 'formal']).default('warm'),
            description: 'Tone style for the welcome message',
            required: true
        }
    } as PromptArgumentSchema<GreetingPromptInput>

    /**
     * 由框架在 `prompts/get` 路径上经 `MCPPrompt.getMessages`（Zod 校验参数）间接调用；返回 **Prompt 消息列表**（与 `MCPTool.execute` 的 tool 结果形状不同）。
     */
    async generateMessages({ name, style }: GreetingPromptInput) {
        const message =
            style === 'formal'
                ? `欢迎你，${name}。愿你今天灵感充沛、诸事顺遂。`
                : `嗨，${name}！欢迎来到诗词与灵感的小天地，祝你今天心情超棒！`

        return [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: message
                }
            }
        ]
    }
}
