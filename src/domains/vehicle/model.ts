/**
 * 车控领域模型
 *
 * 负责调用小模型进行车控意图理解和实体提取
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { DomainModel, DomainContext, IntentResult } from '../../core/types.js'
import type { LLMProvider, ChatRequest } from '../../types/llm.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 车控领域模型
 */
export class VehicleDomainModel implements DomainModel {
  readonly name = 'vehicle_control'
  private readonly provider: LLMProvider
  private readonly systemPrompt: string

  constructor(provider: LLMProvider) {
    this.provider = provider
    this.systemPrompt = this.loadSystemPrompt()
  }

  /**
   * 解析意图
   */
  async parseIntent(query: string, context: DomainContext): Promise<IntentResult> {
    // 构建上下文信息
    const contextInfo = this.buildContextInfo(context)

    const request: ChatRequest = {
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: `上下文:\n${contextInfo}\n\n用户输入: ${query}` },
      ],
      temperature: 0.2,
      maxTokens: 300,
    }

    try {
      const response = await this.provider.chat(request)
      return this.parseResponse(response.content)
    } catch (error) {
      console.error('[VehicleModel] Model call failed:', error)
      return this.createEmptyResult()
    }
  }

  /**
   * 构建上下文信息
   */
  private buildContextInfo(context: DomainContext): string {
    const parts: string[] = []

    // 车辆状态
    const state = context.vehicleState as unknown as Record<string, unknown>

    if (state.ac) {
      const ac = state.ac as Record<string, unknown>
      parts.push(`空调状态: ${ac.isOn ? '开启' : '关闭'}, 温度 ${ac.temperature}°C, 风速 ${ac.fanSpeed}`)
    }

    if (state.windows) {
      const windows = state.windows as Record<string, unknown>
      parts.push(`车窗状态: 主驾 ${windows.frontLeft}%, 副驾 ${windows.frontRight}%, 左后 ${windows.rearLeft}%, 右后 ${windows.rearRight}%`)
    }

    if (state.seats) {
      const seats = state.seats as Record<string, unknown>
      parts.push(`座椅状态: 主驾加热 ${seats.driverHeating}挡, 副驾加热 ${seats.passengerHeating}挡`)
    }

    if (state.lights) {
      const lights = state.lights as Record<string, unknown>
      parts.push(`灯光状态: 氛围灯 ${lights.ambientOn ? '开启' : '关闭'}, 阅读灯 ${lights.readingOn ? '开启' : '关闭'}`)
    }

    return parts.join('\n')
  }

  /**
   * 解析模型响应
   */
  private parseResponse(content: string | null): IntentResult {
    if (!content) {
      return this.createEmptyResult()
    }

    try {
      const jsonStr = this.extractJson(content)
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr)
        return this.validateResult(parsed)
      }
    } catch (error) {
      console.error('[VehicleModel] Failed to parse response:', error)
    }

    return this.createEmptyResult()
  }

  /**
   * 提取 JSON
   */
  private extractJson(text: string): string | null {
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim()
    }

    const jsonObjectMatch = text.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      return jsonObjectMatch[0]
    }

    return null
  }

  /**
   * 验证并规范化结果
   */
  private validateResult(parsed: unknown): IntentResult {
    const p = parsed as Record<string, unknown>

    if (!p.intent || typeof p.intent !== 'string') {
      return this.createEmptyResult()
    }

    // 规范化槽位值
    const slots = this.normalizeSlots(p.intent, p.slots as Record<string, unknown> || {})

    return {
      intent: p.intent,
      slots,
      confidence: Math.max(0, Math.min(1, Number(p.confidence) || 0.8)),
    }
  }

  /**
   * 规范化槽位值
   */
  private normalizeSlots(_intent: string, slots: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...slots }

    // 温度范围限制
    if (typeof result.temperature === 'number') {
      result.temperature = Math.max(16, Math.min(32, result.temperature))
    }

    // 风速范围限制
    if (typeof result.fan_speed === 'number') {
      result.fan_speed = Math.max(1, Math.min(7, Math.round(result.fan_speed)))
    }

    // 座椅等级限制
    if (typeof result.level === 'number') {
      result.level = Math.max(1, Math.min(3, Math.round(result.level)))
    }

    // 车窗开度限制
    if (typeof result.open_percentage === 'number') {
      result.open_percentage = Math.max(0, Math.min(100, Math.round(result.open_percentage)))
    }

    return result
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(): IntentResult {
    return {
      intent: 'unknown',
      slots: {},
      confidence: 0,
    }
  }

  /**
   * 加载系统 Prompt
   */
  private loadSystemPrompt(): string {
    const promptPath = path.join(__dirname, 'prompts', 'vehicle.md')
    try {
      return fs.readFileSync(promptPath, 'utf-8')
    } catch {
      console.warn('[VehicleModel] Failed to load prompt file')
      return '你是车辆控制意图识别模型。请识别用户输入中的控制意图和参数，以JSON格式输出。'
    }
  }
}
