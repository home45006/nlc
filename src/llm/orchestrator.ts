import { Domain, type DomainType, type ChatMessage, type LLMProvider, type DialogOutput, type ToolCall, type VehicleState } from '../types/index.js'
import { PromptBuilder } from './prompt-builder.js'
import { FunctionRegistry } from './function-registry.js'

export interface OrchestratorResult {
  readonly output: DialogOutput
  readonly toolCalls: ReadonlyArray<ToolCall>
}

export class LLMOrchestrator {
  private readonly promptBuilder: PromptBuilder
  private readonly functionRegistry: FunctionRegistry

  constructor(private readonly provider: LLMProvider) {
    this.promptBuilder = new PromptBuilder()
    this.functionRegistry = new FunctionRegistry()
  }

  async process(
    userInput: string,
    history: ReadonlyArray<ChatMessage>,
    vehicleState: VehicleState,
  ): Promise<OrchestratorResult> {
    const startTime = Date.now()

    const messages = this.promptBuilder.buildMessages(userInput, history, vehicleState)
    const tools = this.functionRegistry.getAllTools()

    const response = await this.provider.chat({
      messages,
      tools,
      temperature: 0.3,
      maxTokens: 1024,
    })

    const latencyMs = Date.now() - startTime
    const meta = {
      model: this.provider.name,
      latencyMs,
      tokens: { prompt: response.usage.promptTokens, completion: response.usage.completionTokens },
    }

    if (response.toolCalls.length > 0) {
      const allSlots: Record<string, unknown>[] = []
      let domain: DomainType = Domain.CHAT
      let intent = 'unknown'

      for (const tc of response.toolCalls) {
        const params = JSON.parse(tc.function.arguments) as Record<string, unknown>
        const resolved = this.functionRegistry.resolve(tc.function.name, params)
        domain = resolved.domain
        intent = resolved.intent
        allSlots.push(params)
      }

      const mergedSlots = allSlots.length === 1
        ? allSlots[0]
        : Object.fromEntries(
            response.toolCalls.map((tc, i) => [tc.function.name, allSlots[i]]),
          )

      return {
        output: {
          domain,
          intent,
          slots: mergedSlots,
          confidence: 0.95,
          ttsText: response.content ?? '',
          hasCommand: true,
          meta,
        },
        toolCalls: response.toolCalls,
      }
    }

    return {
      output: {
        domain: Domain.CHAT,
        intent: 'free_chat',
        slots: {},
        confidence: 0.9,
        ttsText: response.content ?? '',
        hasCommand: false,
        meta,
      },
      toolCalls: [],
    }
  }

  /** 带 tool results 的二次请求，获取 TTS 文本 */
  async getToolResponseText(
    messages: ReadonlyArray<ChatMessage>,
  ): Promise<string> {
    const response = await this.provider.chat({
      messages,
      temperature: 0.3,
      maxTokens: 256,
    })
    return response.content ?? '操作已完成。'
  }
}
