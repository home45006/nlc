/**
 * 音乐领域处理器
 */

import type {
  DomainHandler,
  DomainRouting,
  DomainContext,
  DomainResult,
} from '../../core/types.js'
import { BaseDomainHandler } from '../../core/domain-handler.js'
import { MusicDomainModel } from './model.js'
import { parseIntentToCommands, generateTtsText, MusicIntent } from './intent-parser.js'
import { Domain } from '../../types/domain.js'
import type { LLMProvider } from '../../types/llm.js'

export class MusicHandler extends BaseDomainHandler {
  readonly domain = Domain.MUSIC
  private readonly model: MusicDomainModel

  constructor(provider: LLMProvider) {
    super()
    this.model = new MusicDomainModel(provider)
  }

  async handle(routing: DomainRouting, context: DomainContext): Promise<DomainResult> {
    const intentResult = await this.model.parseIntent(routing.rewrittenQuery, context)

    if (intentResult.confidence < 0.3 || intentResult.intent === 'unknown') {
      return this.createEmptyResult('抱歉，我没有理解您的音乐控制指令')
    }

    const commands = parseIntentToCommands(intentResult)

    if (commands.length === 0) {
      return this.createEmptyResult('抱歉，无法识别有效的音乐控制指令')
    }

    const ttsText = generateTtsText(intentResult.intent as MusicIntent, intentResult.slots)

    return this.createResult(intentResult.intent, intentResult.slots, commands, {
      ttsText,
      confidence: intentResult.confidence,
    })
  }
}

export function createMusicHandler(provider: LLMProvider): DomainHandler {
  return new MusicHandler(provider)
}
