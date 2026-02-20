import 'dotenv/config'
import type { ChatRequest, ChatResponse, LLMProvider, StreamChunkHandler, ToolCall } from '../../types/index.js'
import { logger } from '../../utils/logger.js'

const MINIMAX_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2'
const DEFAULT_TIMEOUT_MS = 30000

interface MiniMaxToolCall {
  readonly id: string
  readonly type: 'function'
  readonly function: {
    readonly name: string
    readonly arguments: string
  }
}

interface MiniMaxMessage {
  readonly role: string
  readonly content: string | null
  readonly tool_calls?: ReadonlyArray<MiniMaxToolCall>
  readonly tool_call_id?: string
}

interface MiniMaxChoice {
  readonly message: MiniMaxMessage
  readonly finish_reason: string
}

interface MiniMaxResponse {
  readonly choices: ReadonlyArray<MiniMaxChoice>
  readonly usage: {
    readonly prompt_tokens: number
    readonly completion_tokens: number
    readonly total_tokens: number
  }
}

/**
 * MiniMax 大模型 Provider
 *
 * 支持 Anthropic API 兼容格式: https://platform.minimaxi.com/docs/api-reference/text-anthropic-api
 */
export class MiniMaxProvider implements LLMProvider {
  readonly name: string

  constructor(
    private readonly apiKey: string,
    private readonly model: string = process.env.MINIMAX_MODEL ?? 'MiniMax-M2.5',
  ) {
    this.name = model
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = request.messages.map((m) => {
      const msg: Record<string, unknown> = {
        role: m.role,
        content: m.content,
      }

      if (m.tool_calls && m.tool_calls.length > 0) {
        msg.tool_calls = m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments:
              typeof tc.function.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function.arguments),
          },
        }))
      }

      if (m.tool_call_id) {
        msg.tool_call_id = m.tool_call_id
      }

      return msg
    })

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 1024,
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const response = await fetch(MINIMAX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MiniMax API error (${response.status}): ${errorText}`)
      }

      const data = (await response.json()) as MiniMaxResponse

      const choice = data.choices[0]

      if (!choice) {
        throw new Error('MiniMax API returned empty choices')
      }

      if (!choice.message.content) {
        logger.warn('[MiniMax] content is empty')
      }

      const toolCalls: ReadonlyArray<ToolCall> =
        choice.message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })) ?? []

      // MiniMax M2.1 等模型可能返回 reasoning_content 而不是 content
      const content = choice.message.content || choice.message.reasoning_content || ''

      return {
        content,
        toolCalls,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        },
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`MiniMax API 请求超时 (${DEFAULT_TIMEOUT_MS}ms)`)
      }
      throw error
    }
  }

  async streamChat(request: ChatRequest, onChunk: StreamChunkHandler): Promise<ChatResponse> {
    const messages = request.messages.map((m) => {
      const msg: Record<string, unknown> = {
        role: m.role,
        content: m.content,
      }

      if (m.tool_calls && m.tool_calls.length > 0) {
        msg.tool_calls = m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments:
              typeof tc.function.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function.arguments),
          },
        }))
      }

      if (m.tool_call_id) {
        msg.tool_call_id = m.tool_call_id
      }

      return msg
    })

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 1024,
      stream: true,
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const response = await fetch(MINIMAX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MiniMax API error (${response.status}): ${errorText}`)
      }

      if (!response.body) {
        throw new Error('MiniMax API returned empty response body')
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
                const data = JSON.parse(dataStr) as MiniMaxStreamChoice
                const delta = data.choices?.[0]?.delta

                // MiniMax 流式响应：先返回 reasoning_content，最后返回 content
                // 只收集 content，忽略 reasoning_content
                const content = delta?.content || ''

                if (content) {
                  fullText += content
                  onChunk(content)
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
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`MiniMax API 请求超时 (${DEFAULT_TIMEOUT_MS}ms)`)
      }
      throw error
    }
  }
}

// MiniMax 流式响应增量类型
interface MiniMaxStreamChoice {
  id?: string
  choices?: Array<{
    index?: number
    delta?: {
      role?: string
      content?: string
      name?: string
      audio_content?: string
      reasoning_content?: string
    }
    finish_reason?: string
  }>
  created?: number
  model?: string
  object?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
