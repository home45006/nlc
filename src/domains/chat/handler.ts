/**
 * 智能问答领域处理器
 */

import type {
  DomainHandler,
  DomainRouting,
  DomainContext,
  DomainResult,
} from '../../core/types.js'
import { BaseDomainHandler } from '../../core/domain-handler.js'
import { ChatDomainModel } from './model.js'
import { Domain } from '../../types/domain.js'
import type { LLMProvider } from '../../types/llm.js'

/**
 * 智能问答领域处理器
 */
export class ChatHandler extends BaseDomainHandler {
  readonly domain = Domain.CHAT
  private readonly model: ChatDomainModel

  constructor(provider: LLMProvider) {
    super()
    this.model = new ChatDomainModel(provider)
  }

  async handle(routing: DomainRouting, context: DomainContext): Promise<DomainResult> {
    // 调用模型生成回复
    const intentResult = await this.model.parseIntent(routing.rewrittenQuery, context)

    // 问答领域不需要执行指令，直接返回 TTS 文本
    const reply = intentResult.slots.reply as string || '好的'

    return this.createResult(intentResult.intent, intentResult.slots, [], {
      ttsText: reply,
      shouldContinue: false,
      confidence: intentResult.confidence,
    })
  }
}

/**
 * 创建智能问答处理器
 */
export function createChatHandler(provider: LLMProvider): DomainHandler {
  return new ChatHandler(provider)
}
