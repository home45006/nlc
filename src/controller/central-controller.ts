/**
 * 中枢控制器
 *
 * 大模型作为中枢控制器，负责：
 * 1. 落域识别 - 判断用户输入属于哪个领域
 * 2. 多意图拆分 - 一语多意图的 Query 改写
 * 3. Query 改写 - 使后续小模型能准确处理
 *
 * 注意：此控制器用于路由场景。
 * 主要的 Skill 处理应使用 FileBasedSkillOrchestrator。
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type {
  CentralController,
  MultiIntentRouting,
  DomainRouting,
  RoutingContext,
} from '../core/types.js'
import type { LLMProvider, ChatRequest, ChatMessage } from '../types/llm.js'
import { Domain } from '../types/domain.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 中枢控制器配置
 */
export interface CentralControllerConfig {
  /** LLM Provider */
  provider: LLMProvider
}

/**
 * 中枢控制器实现
 */
export class CentralControllerImpl implements CentralController {
  private readonly provider: LLMProvider
  private readonly systemPrompt: string

  constructor(provider: LLMProvider)
  constructor(config: CentralControllerConfig)
  constructor(providerOrConfig: LLMProvider | CentralControllerConfig) {
    if ('provider' in providerOrConfig) {
      // 配置对象模式
      this.provider = providerOrConfig.provider
    } else {
      // 传统参数模式
      this.provider = providerOrConfig
    }

    this.systemPrompt = this.loadSystemPrompt()
  }

  /**
   * 执行落域识别和多意图拆分
   */
  async route(userInput: string, context: RoutingContext): Promise<MultiIntentRouting> {
    // 构建请求
    const messages = this.buildMessages(userInput, context)

    const request: ChatRequest = {
      messages,
      temperature: 0.1, // 低温度以获得更确定的输出
      maxTokens: 1000,
    }

    try {
      const response = await this.provider.chat(request)
      return this.parseResponse(response.content, userInput)
    } catch (error) {
      console.error('[CentralController] Routing failed:', error)
      // 失败时返回 chat 域作为兜底
      return this.createFallbackRouting(userInput)
    }
  }

  /**
   * 构建消息列表
   */
  private buildMessages(userInput: string, context: RoutingContext): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
    ]

    // 添加对话历史（最近 10 条）
    const recentHistory = context.dialogHistory.slice(-10)
    if (recentHistory.length > 0) {
      const historyText = this.formatHistory(recentHistory)
      messages.push({
        role: 'user',
        content: `以下是最近的对话历史：\n${historyText}\n\n请基于以上上下文，对用户的最新输入进行落域识别和 Query 改写。`,
      })
    }

    // 添加车辆状态
    const stateText = this.formatVehicleState(context.vehicleState)
    messages.push({
      role: 'user',
      content: `当前车辆状态：\n${stateText}`,
    })

    // 用户输入
    messages.push({
      role: 'user',
      content: `用户输入：「${userInput}」`,
    })

    return messages
  }

  /**
   * 格式化对话历史
   */
  private formatHistory(history: ChatMessage[]): string {
    return history
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => {
        const role = msg.role === 'user' ? '用户' : '助手'
        return `${role}: ${msg.content}`
      })
      .join('\n')
  }

  /**
   * 格式化车辆状态
   */
  private formatVehicleState(state: unknown): string {
    const s = state as Record<string, unknown>
    const parts: string[] = []

    if (s.ac) {
      const ac = s.ac as Record<string, unknown>
      parts.push(`- 空调: ${ac.isOn ? '开启' : '关闭'}, 温度 ${ac.temperature}°C, 风速 ${ac.fanSpeed}`)
    }
    if (s.music) {
      const music = s.music as Record<string, unknown>
      parts.push(`- 音乐: ${music.isPlaying ? '播放中' : '暂停'}, 音量 ${music.volume}%`)
    }
    if (s.navigation) {
      const nav = s.navigation as Record<string, unknown>
      if (nav.isActive) {
        parts.push(`- 导航: 目的地 ${nav.destination}`)
      } else {
        parts.push(`- 导航: 未启动`)
      }
    }
    if (s.windows) {
      const windows = s.windows as Record<string, unknown>
      parts.push(`- 车窗: 主驾 ${windows.frontLeft}%, 副驾 ${windows.frontRight}%`)
    }
    if (s.seats) {
      const seats = s.seats as Record<string, unknown>
      parts.push(`- 座椅: 主驾加热 ${seats.driverHeating}挡, 副驾加热 ${seats.passengerHeating}挡`)
    }

    return parts.join('\n')
  }

  /**
   * 解析模型响应
   */
  private parseResponse(content: string | null, originalInput: string): MultiIntentRouting {
    if (!content) {
      return this.createFallbackRouting(originalInput)
    }

    try {
      // 尝试提取 JSON
      const jsonStr = this.extractJson(content)
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr)
        return this.validateRouting(parsed, originalInput)
      }
    } catch (error) {
      console.error('[CentralController] Failed to parse response:', error)
    }

    return this.createFallbackRouting(originalInput)
  }

  /**
   * 从文本中提取 JSON
   */
  private extractJson(text: string): string | null {
    // 尝试匹配 ```json ... ``` 块
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim()
    }

    // 尝试匹配 { ... } 块
    const jsonObjectMatch = text.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      return jsonObjectMatch[0]
    }

    return null
  }

  /**
   * 验证路由结果
   */
  private validateRouting(parsed: unknown, originalInput: string): MultiIntentRouting {
    const p = parsed as Record<string, unknown>

    if (!Array.isArray(p.routings) || p.routings.length === 0) {
      return this.createFallbackRouting(originalInput)
    }

    const routings = p.routings.map((r: Record<string, unknown>) => {
      const domain = this.validateDomain(r.domain as string)
      const ctx = r.context as Record<string, unknown> | undefined
      return {
        domain,
        rewrittenQuery: String(r.rewrittenQuery || originalInput),
        originalQuery: originalInput,
        confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0.8)),
        context: ctx ? {
          previousDomain: ctx.previousDomain as string | undefined,
          relatedEntities: ctx.relatedEntities as Record<string, unknown> | undefined,
          isInherited: Boolean(ctx.isInherited),
        } : undefined,
      } as DomainRouting
    })

    return {
      routings,
      isSequential: Boolean(p.isSequential),
      overallConfidence: Math.max(0, Math.min(1, Number(p.overallConfidence) || 0.8)),
    }
  }

  /**
   * 验证领域是否有效
   */
  private validateDomain(domain: string): string {
    const validDomains = Object.values(Domain)
    return validDomains.includes(domain as (typeof validDomains)[number])
      ? domain
      : Domain.CHAT
  }

  /**
   * 创建兜底路由结果
   */
  private createFallbackRouting(userInput: string): MultiIntentRouting {
    return {
      routings: [
        {
          domain: Domain.CHAT,
          rewrittenQuery: userInput,
          originalQuery: userInput,
          confidence: 0.5,
        },
      ],
      isSequential: false,
      overallConfidence: 0.5,
    }
  }

  /**
   * 加载系统 Prompt
   */
  private loadSystemPrompt(): string {
    // 尝试加载静态文件
    const promptPath = path.join(__dirname, 'prompts', 'routing.md')
    try {
      return fs.readFileSync(promptPath, 'utf-8')
    } catch {
      console.warn('[CentralController] Failed to load prompt file, using default')
      return this.getDefaultPrompt()
    }
  }

  /**
   * 获取默认 Prompt
   */
  private getDefaultPrompt(): string {
    return `你是智能座舱系统的领域路由控制器。请分析用户输入并返回 JSON 格式的路由结果。

领域包括: vehicle_control, music, navigation, chat

输出格式:
{
  "routings": [
    {
      "domain": "领域名称",
      "rewrittenQuery": "改写后的查询",
      "originalQuery": "原始输入",
      "confidence": 0.95
    }
  ],
  "isSequential": true,
  "overallConfidence": 0.95
}`
  }
}
