/**
 * 车控领域处理器
 *
 * 组合模型和解析器，处理车控领域的完整流程
 */

import type {
  DomainHandler,
  DomainRouting,
  DomainContext,
  DomainResult,
} from '../../core/types.js'
import { BaseDomainHandler } from '../../core/domain-handler.js'
import { VehicleDomainModel } from './model.js'
import { parseIntentToCommands, generateTtsText } from './intent-parser.js'
import { Domain } from '../../types/domain.js'
import type { LLMProvider } from '../../types/llm.js'

// 旁路模式：跳过意图提取，直接返回落域结果
const BYPASS_INTENT_EXTRACTION = true

/**
 * 车控领域处理器
 */
export class VehicleControlHandler extends BaseDomainHandler {
  readonly domain = Domain.VEHICLE_CONTROL
  private readonly model: VehicleDomainModel

  constructor(provider: LLMProvider) {
    super()
    this.model = new VehicleDomainModel(provider)
  }

  /**
   * 处理车控路由
   */
  async handle(routing: DomainRouting, context: DomainContext): Promise<DomainResult> {
    // 旁路模式：直接返回落域结果，跳过意图提取
    if (BYPASS_INTENT_EXTRACTION) {
      return this.createResult('bypass', { rewrittenQuery: routing.rewrittenQuery }, [], {
        ttsText: `[车控领域] 改写后: "${routing.rewrittenQuery}"`,
        confidence: routing.confidence,
      })
    }

    // 正常模式：调用小模型进行意图解析
    const intentResult = await this.model.parseIntent(routing.rewrittenQuery, context)

    if (intentResult.confidence < 0.3 || intentResult.intent === 'unknown') {
      return this.createEmptyResult('抱歉，我没有理解您的车控指令')
    }

    // 解析为可执行指令
    const commands = parseIntentToCommands(intentResult)

    if (commands.length === 0) {
      return this.createEmptyResult('抱歉，无法识别有效的车控指令')
    }

    // 生成 TTS 文本
    const ttsText = generateTtsText(
      intentResult.intent as 'ac' | 'window' | 'seat' | 'light' | 'trunk' | 'wiper' | 'unknown',
      intentResult.slots
    )

    return this.createResult(intentResult.intent, intentResult.slots, commands, {
      ttsText,
      confidence: intentResult.confidence,
    })
  }
}

/**
 * 创建车控领域处理器
 */
export function createVehicleControlHandler(provider: LLMProvider): DomainHandler {
  return new VehicleControlHandler(provider)
}
