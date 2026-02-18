export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool'
  readonly content: string | null
  readonly tool_calls?: ReadonlyArray<ToolCall>
  readonly tool_call_id?: string
}

export interface ToolCall {
  readonly id: string
  readonly type: 'function'
  readonly function: {
    readonly name: string
    readonly arguments: string
  }
}

export interface ToolDefinition {
  readonly type: 'function'
  readonly function: {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>
  }
}

export interface ChatRequest {
  readonly messages: ReadonlyArray<ChatMessage>
  readonly tools?: ReadonlyArray<ToolDefinition>
  readonly temperature?: number
  readonly maxTokens?: number
}

export interface ChatResponse {
  readonly content: string | null
  readonly toolCalls: ReadonlyArray<ToolCall>
  readonly usage: {
    readonly promptTokens: number
    readonly completionTokens: number
  }
}

/**
 * 流式输出回调
 */
export type StreamChunkHandler = (chunk: string) => void | Promise<void>

export interface LLMProvider {
  readonly name: string
  chat(request: ChatRequest): Promise<ChatResponse>
  /**
   * 流式聊天，返回增量内容
   * @param request 请求
   * @param onChunk 每收到一个 chunk 时的回调
   * @returns 完整的响应
   */
  streamChat(request: ChatRequest, onChunk: StreamChunkHandler): Promise<ChatResponse>
}
