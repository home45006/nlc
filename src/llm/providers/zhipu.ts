import type { ChatRequest, ChatResponse, LLMProvider, StreamChunkHandler, ToolCall } from '../../types/index.js'

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

interface ZhipuToolCall {
  readonly id: string
  readonly type: 'function'
  readonly function: {
    readonly name: string
    readonly arguments: string
  }
}

interface ZhipuChoice {
  readonly message: {
    readonly role: string
    readonly content: string | null
    readonly tool_calls?: ReadonlyArray<ZhipuToolCall>
  }
  readonly finish_reason: string
}

interface ZhipuResponse {
  readonly choices: ReadonlyArray<ZhipuChoice>
  readonly usage: {
    readonly prompt_tokens: number
    readonly completion_tokens: number
    readonly total_tokens: number
  }
}

export class ZhipuProvider implements LLMProvider {
  readonly name: string

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'glm-4-flash',
  ) {
    this.name = model
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 1024,
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools
    }

    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Zhipu API error (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as ZhipuResponse
    const choice = data.choices[0]

    if (!choice) {
      throw new Error('Zhipu API returned empty choices')
    }

    const toolCalls: ReadonlyArray<ToolCall> = choice.message.tool_calls?.map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    })) ?? []

    return {
      content: choice.message.content,
      toolCalls,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      },
    }
  }

  async streamChat(request: ChatRequest, onChunk: StreamChunkHandler): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 1024,
      stream: true,
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools
    }

    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Zhipu API error (${response.status}): ${errorText}`)
    }

    if (!response.body) {
      throw new Error('Zhipu API returned empty response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let promptTokens = 0
    let completionTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (dataStr === '[DONE]') continue

            try {
              const data = JSON.parse(dataStr) as ZhipuStreamChoice

              const content = data.delta?.content || ''
              if (content) {
                fullText += content
                await onChunk(content)
              }

              if (data.usage) {
                promptTokens = data.usage.prompt_tokens ?? promptTokens
                completionTokens = data.usage.completion_tokens ?? completionTokens
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return {
      content: fullText || null,
      toolCalls: [],
      usage: { promptTokens, completionTokens },
    }
  }
}

// 智谱流式响应增量类型
interface ZhipuStreamChoice {
  delta?: {
    role?: string
    content?: string
  }
  finish_reason?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
