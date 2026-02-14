import type { ChatRequest, ChatResponse, LLMProvider, ToolCall } from '../../types/index.js'

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
}
