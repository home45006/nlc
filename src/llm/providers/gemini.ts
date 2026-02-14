import type { ChatMessage, ChatRequest, ChatResponse, LLMProvider, ToolCall, ToolDefinition } from '../../types/index.js'

const GEMINI_MODEL = 'gemini-3-flash-preview'

function getApiUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
}

// ---- Gemini API 类型 ----

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}

interface GeminiTool {
  functionDeclarations: GeminiFunctionDeclaration[]
}

interface GeminiFunctionDeclaration {
  name: string
  description: string
  parameters: Record<string, unknown>
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: GeminiPart[]
      role: string
    }
    finishReason: string
  }>
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
  error?: { code: number; message: string; status: string }
}

// ---- 格式转换 ----

function convertMessages(messages: ReadonlyArray<ChatMessage>): {
  systemInstruction: string | undefined
  contents: GeminiContent[]
} {
  let systemInstruction: string | undefined
  const contents: GeminiContent[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content
      continue
    }

    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] })
      continue
    }

    if (msg.role === 'assistant') {
      const parts: GeminiPart[] = []
      if (msg.content) {
        parts.push({ text: msg.content })
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
            },
          })
        }
      }
      if (parts.length > 0) {
        contents.push({ role: 'model', parts })
      }
      continue
    }

    if (msg.role === 'tool') {
      // Gemini 要求 functionResponse 放在 user 角色下，或者跟在 model 的 functionCall 后面
      // 实际上 Gemini 使用 role: "user" + functionResponse part
      // 但如果前一条是 model 的 functionCall，需要合并为 function response
      const response = JSON.parse(msg.content) as Record<string, unknown>
      // 找到对应的 function name
      const fnName = findFunctionNameForToolCallId(messages, msg.tool_call_id)
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: fnName ?? 'unknown',
            response,
          },
        }],
      })
    }
  }

  // Gemini 不允许连续相同 role，合并连续的 user 消息
  return { systemInstruction, contents: mergeConsecutiveRoles(contents) }
}

function findFunctionNameForToolCallId(
  messages: ReadonlyArray<ChatMessage>,
  toolCallId: string | undefined,
): string | undefined {
  if (!toolCallId) return undefined
  for (const msg of messages) {
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc.id === toolCallId) return tc.function.name
      }
    }
  }
  return undefined
}

function mergeConsecutiveRoles(contents: GeminiContent[]): GeminiContent[] {
  const merged: GeminiContent[] = []
  for (const item of contents) {
    const last = merged[merged.length - 1]
    if (last && last.role === item.role) {
      last.parts.push(...item.parts)
    } else {
      merged.push({ role: item.role, parts: [...item.parts] })
    }
  }
  return merged
}

function convertTools(tools: ReadonlyArray<ToolDefinition>): GeminiTool[] {
  const declarations: GeminiFunctionDeclaration[] = tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }))
  return [{ functionDeclarations: declarations }]
}

// ---- Provider ----

export class GeminiProvider implements LLMProvider {
  readonly name = GEMINI_MODEL

  constructor(private readonly apiKey: string) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { systemInstruction, contents } = convertMessages(request.messages)

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.3,
        maxOutputTokens: request.maxTokens ?? 1024,
        // 关闭 thinking 模式，提升 function calling 稳定性
        thinkingConfig: { thinkingBudget: 0 },
      },
    }

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = convertTools(request.tools)
      // AUTO 模式：模型自行决定是否调用工具，但更积极
      body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } }
    }

    const response = await fetch(getApiUrl(this.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as GeminiResponse

    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`)
    }

    const candidate = data.candidates?.[0]
    if (!candidate) {
      throw new Error('Gemini API returned empty candidates')
    }

    // 解析响应 parts
    let textContent = ''
    const toolCalls: ToolCall[] = []
    let callIndex = 0
    const parts = candidate.content?.parts ?? []

    for (const part of parts) {
      if (part.text) {
        textContent += part.text
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${callIndex++}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args),
          },
        })
      }
    }

    return {
      content: textContent || null,
      toolCalls,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    }
  }
}
