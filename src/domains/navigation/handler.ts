/**
 * 导航领域处理器
 */

import type {
  DomainHandler,
  DomainRouting,
  DomainContext,
  DomainResult,
} from '../../core/types.js'
import { BaseDomainHandler } from '../../core/domain-handler.js'
import { NavigationDomainModel } from './model.js'
import { parseIntentToCommands, generateTtsText, NavigationIntent } from './intent-parser.js'
import { Domain } from '../../types/domain.js'
import type { LLMProvider } from '../../types/llm.js'

export class NavigationHandler extends BaseDomainHandler {
  readonly domain = Domain.NAVIGATION
  private readonly model: NavigationDomainModel

  constructor(provider: LLMProvider) {
    super()
    this.model = new NavigationDomainModel(provider)
  }

  async handle(routing: DomainRouting, context: DomainContext): Promise<DomainResult> {
    const intentResult = await this.model.parseIntent(routing.rewrittenQuery, context)

    if (intentResult.confidence < 0.3 || intentResult.intent === 'unknown') {
      return this.createEmptyResult('抱歉，我没有理解您的导航指令')
    }

    const commands = parseIntentToCommands(intentResult)

    if (commands.length === 0) {
      return this.createEmptyResult('抱歉，无法识别有效的导航指令')
    }

    const ttsText = generateTtsText(intentResult.intent as NavigationIntent, intentResult.slots)

    return this.createResult(intentResult.intent, intentResult.slots, commands, {
      ttsText,
      confidence: intentResult.confidence,
    })
  }
}

export function createNavigationHandler(provider: LLMProvider): DomainHandler {
  return new NavigationHandler(provider)
}
