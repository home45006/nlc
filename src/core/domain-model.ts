/**
 * 领域模型模块
 *
 * 提供领域模型的基础抽象和工具函数
 * 领域模型负责调用小模型进行意图理解和实体提取
 */

import type { DomainModel, DomainContext, IntentResult } from './types.js'
import type { ChatRequest, ChatResponse, LLMProvider } from '../types/llm.js'

/**
 * 基础领域模型抽象类
 *
 * 提供通用的小模型调用流程
 */
export abstract class BaseDomainModel implements DomainModel {
  abstract readonly name: string

  protected readonly provider: LLMProvider

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  abstract parseIntent(query: string, context: DomainContext): Promise<IntentResult>

  /**
   * 调用小模型
   */
  protected async callModel(request: ChatRequest): Promise<ChatResponse> {
    return this.provider.chat(request)
  }

  /**
   * 创建成功的意图结果
   */
  protected createIntentResult(
    intent: string,
    slots: Record<string, unknown>,
    confidence: number = 1.0
  ): IntentResult {
    return {
      intent,
      slots,
      confidence,
    }
  }

  /**
   * 创建空意图结果（无法识别）
   */
  protected createEmptyIntentResult(): IntentResult {
    return {
      intent: 'unknown',
      slots: {},
      confidence: 0,
    }
  }
}

/**
 * 领域模型配置
 */
export interface DomainModelConfig {
  /** 温度参数 */
  readonly temperature?: number
  /** 最大 Token 数 */
  readonly maxTokens?: number
  /** System Prompt */
  readonly systemPrompt: string
}

/**
 * 简单领域模型实现
 *
 * 使用 System Prompt 进行意图解析
 */
export class SimpleDomainModel extends BaseDomainModel {
  readonly name: string
  private readonly config: DomainModelConfig

  constructor(name: string, provider: LLMProvider, config: DomainModelConfig) {
    super(provider)
    this.name = name
    this.config = config
  }

  async parseIntent(query: string, context: DomainContext): Promise<IntentResult> {
    // 构建上下文信息
    const contextInfo = this.buildContextInfo(context)

    const request: ChatRequest = {
      messages: [
        { role: 'system', content: this.config.systemPrompt },
        { role: 'user', content: `上下文信息:\n${contextInfo}\n\n用户输入: ${query}` },
      ],
      temperature: this.config.temperature ?? 0.3,
      maxTokens: this.config.maxTokens ?? 500,
    }

    try {
      const response = await this.callModel(request)
      return this.parseResponse(response.content)
    } catch (error) {
      console.error(`[${this.name}] Model call failed:`, error)
      return this.createEmptyIntentResult()
    }
  }

  /**
   * 构建上下文信息字符串
   */
  private buildContextInfo(context: DomainContext): string {
    const parts: string[] = []

    // 添加车辆状态摘要
    parts.push('当前车辆状态:')
    parts.push(this.formatVehicleState(context.vehicleState))

    // 添加最近的对话历史
    if (context.dialogHistory.length > 0) {
      const recentHistory = context.dialogHistory.slice(-4)
      parts.push('\n最近对话:')
      recentHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          parts.push(`  ${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
        }
      })
    }

    return parts.join('\n')
  }

  /**
   * 格式化车辆状态
   */
  private formatVehicleState(state: unknown): string {
    // 简化输出，只显示关键状态
    const s = state as Record<string, unknown>
    const parts: string[] = []

    if (s.ac) {
      const ac = s.ac as Record<string, unknown>
      parts.push(`  空调: ${ac.isOn ? '开启' : '关闭'}, 温度: ${ac.temperature}°C`)
    }
    if (s.music) {
      const music = s.music as Record<string, unknown>
      parts.push(`  音乐: ${music.isPlaying ? '播放中' : '暂停'}, 音量: ${music.volume}%`)
    }
    if (s.navigation) {
      const nav = s.navigation as Record<string, unknown>
      if (nav.isActive) {
        parts.push(`  导航: 目的地 ${nav.destination}`)
      }
    }

    return parts.join('\n')
  }

  /**
   * 解析模型响应
   */
  private parseResponse(content: string | null): IntentResult {
    if (!content) {
      return this.createEmptyIntentResult()
    }

    try {
      // 尝试解析 JSON 响应
      const parsed = JSON.parse(content)
      return {
        intent: parsed.intent ?? 'unknown',
        slots: parsed.slots ?? {},
        confidence: parsed.confidence ?? 0.8,
      }
    } catch {
      // 如果不是 JSON，尝试从文本中提取
      return this.extractFromText(content)
    }
  }

  /**
   * 从文本中提取意图和槽位
   */
  private extractFromText(text: string): IntentResult {
    // 简单的文本解析逻辑
    const intentMatch = text.match(/intent[:\s]+["']?(\w+)["']?/i)
    const slotsMatch = text.match(/slots[:\s]+(\{[^}]+\})/i)

    return {
      intent: intentMatch?.[1] ?? 'unknown',
      slots: slotsMatch ? this.parseSlots(slotsMatch[1]) : {},
      confidence: 0.6,
    }
  }

  /**
   * 解析槽位 JSON
   */
  private parseSlots(jsonStr: string): Record<string, unknown> {
    try {
      return JSON.parse(jsonStr)
    } catch {
      return {}
    }
  }
}

/**
 * 规则基础领域模型
 *
 * 使用规则进行意图解析（不调用模型）
 */
export class RuleBasedDomainModel implements DomainModel {
  readonly name: string
  private readonly rules: RuleDefinition[]

  constructor(name: string, rules: RuleDefinition[]) {
    this.name = name
    this.rules = rules
  }

  async parseIntent(query: string, _context: DomainContext): Promise<IntentResult> {
    const normalizedQuery = query.toLowerCase()

    for (const rule of this.rules) {
      if (rule.pattern.test(normalizedQuery)) {
        const slots = rule.extractSlots ? rule.extractSlots(query) : {}
        return {
          intent: rule.intent,
          slots,
          confidence: rule.confidence ?? 0.9,
        }
      }
    }

    return {
      intent: 'unknown',
      slots: {},
      confidence: 0,
    }
  }
}

/**
 * 规则定义
 */
export interface RuleDefinition {
  /** 匹配模式 */
  readonly pattern: RegExp
  /** 意图类型 */
  readonly intent: string
  /** 槽位提取函数 */
  readonly extractSlots?: (query: string) => Record<string, unknown>
  /** 置信度 */
  readonly confidence?: number
}
