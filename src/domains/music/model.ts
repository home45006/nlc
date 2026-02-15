/**
 * 音乐领域模型
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { DomainModel, DomainContext, IntentResult } from '../../core/types.js'
import type { LLMProvider, ChatRequest } from '../../types/llm.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class MusicDomainModel implements DomainModel {
  readonly name = 'music'
  private readonly provider: LLMProvider
  private readonly systemPrompt: string

  constructor(provider: LLMProvider) {
    this.provider = provider
    this.systemPrompt = this.loadSystemPrompt()
  }

  async parseIntent(query: string, context: DomainContext): Promise<IntentResult> {
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
      return this.parseResponse(response.content, context)
    } catch (error) {
      console.error('[MusicModel] Model call failed:', error)
      return this.createEmptyResult()
    }
  }

  private buildContextInfo(context: DomainContext): string {
    const state = context.vehicleState as unknown as Record<string, unknown>
    const parts: string[] = []

    if (state.music) {
      const music = state.music as Record<string, unknown>
      parts.push(`音乐状态: ${music.isPlaying ? '播放中' : '暂停'}, 音量 ${music.volume}%`)
      if (music.track) {
        parts.push(`当前曲目: ${music.track}`)
      }
    }

    return parts.join('\n')
  }

  private parseResponse(content: string | null, context: DomainContext): IntentResult {
    if (!content) {
      return this.createEmptyResult()
    }

    try {
      const jsonStr = this.extractJson(content)
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr)
        return this.validateResult(parsed, context)
      }
    } catch (error) {
      console.error('[MusicModel] Failed to parse response:', error)
    }

    return this.createEmptyResult()
  }

  private extractJson(text: string): string | null {
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) return jsonBlockMatch[1].trim()

    const jsonObjectMatch = text.match(/\{[\s\S]*\}/)
    return jsonObjectMatch ? jsonObjectMatch[0] : null
  }

  private validateResult(parsed: unknown, context: DomainContext): IntentResult {
    const p = parsed as Record<string, unknown>

    if (!p.intent || typeof p.intent !== 'string') {
      return this.createEmptyResult()
    }

    let slots = { ...(p.slots as Record<string, unknown> || {}) }

    // 处理相对音量调整
    if (slots.volume_delta !== undefined) {
      const delta = Number(slots.volume_delta)
      const currentVolume = this.getCurrentVolume(context)
      slots.volume = Math.max(0, Math.min(100, currentVolume + delta))
      delete slots.volume_delta
    }

    // 音量范围限制
    if (typeof slots.volume === 'number') {
      slots.volume = Math.max(0, Math.min(100, Math.round(slots.volume)))
    }

    return {
      intent: p.intent,
      slots,
      confidence: Math.max(0, Math.min(1, Number(p.confidence) || 0.8)),
    }
  }

  private getCurrentVolume(context: DomainContext): number {
    const state = context.vehicleState as unknown as Record<string, unknown>
    if (state.music) {
      const music = state.music as Record<string, unknown>
      return Number(music.volume) || 50
    }
    return 50
  }

  private createEmptyResult(): IntentResult {
    return { intent: 'unknown', slots: {}, confidence: 0 }
  }

  private loadSystemPrompt(): string {
    const promptPath = path.join(__dirname, 'prompts', 'music.md')
    try {
      return fs.readFileSync(promptPath, 'utf-8')
    } catch {
      return '你是音乐控制意图识别模型。请识别用户输入中的控制意图和参数，以JSON格式输出。'
    }
  }
}
