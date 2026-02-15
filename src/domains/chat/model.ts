/**
 * 智能问答领域模型
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { DomainModel, DomainContext, IntentResult, ChatSubTypeType } from '../../core/types.js'
import { ChatSubType } from '../../core/types.js'
import type { LLMProvider, ChatRequest } from '../../types/llm.js'
import { ContextManager } from './context-manager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 问答领域模型
 */
export class ChatDomainModel implements DomainModel {
  readonly name = 'chat'
  private readonly provider: LLMProvider
  private readonly systemPrompt: string
  private readonly contextManager: ContextManager

  constructor(provider: LLMProvider) {
    this.provider = provider
    this.systemPrompt = this.loadSystemPrompt()
    this.contextManager = new ContextManager()
  }

  /**
   * 解析意图（生成回复）
   */
  async parseIntent(query: string, context: DomainContext): Promise<IntentResult> {
    // 更新上下文
    this.contextManager.updateContext({ role: 'user', content: query })

    // 判断子类型
    const subType = this.detectSubType(query, context)

    // 构建请求
    const request: ChatRequest = {
      messages: this.buildMessages(query, context),
      temperature: 0.7,
      maxTokens: 200,
    }

    try {
      const response = await this.provider.chat(request)
      const reply = response.content || '抱歉，我没听清楚，请再说一次。'

      return {
        intent: subType,
        slots: { reply },
        confidence: 0.9,
      }
    } catch (error) {
      console.error('[ChatModel] Model call failed:', error)
      return {
        intent: ChatSubType.FREE_CHAT,
        slots: { reply: '抱歉，我暂时无法回应，请稍后再试。' },
        confidence: 0.5,
      }
    }
  }

  /**
   * 检测问答子类型
   */
  private detectSubType(query: string, _context: DomainContext): ChatSubTypeType {
    const lowerQuery = query.toLowerCase()

    // 车辆问答关键词
    const vehicleKeywords = ['指示灯', '什么意思', '怎么用', '如何', '为什么', '功能', '按钮']
    if (vehicleKeywords.some(kw => lowerQuery.includes(kw))) {
      return ChatSubType.VEHICLE_QA
    }

    // 多轮对话检测
    const conversationContext = this.contextManager.getContext()
    if (conversationContext.turnCount > 1) {
      return ChatSubType.MULTI_TURN
    }

    return ChatSubType.FREE_CHAT
  }

  /**
   * 构建消息列表
   */
  private buildMessages(query: string, context: DomainContext): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
    ]

    // 添加车辆状态信息
    const stateInfo = this.formatVehicleState(context.vehicleState)
    if (stateInfo) {
      messages.push({
        role: 'system',
        content: `当前车辆状态：\n${stateInfo}`,
      })
    }

    // 添加压缩后的对话历史
    const compressedHistory = this.contextManager.compressHistory(
      context.dialogHistory.filter(m => m.role === 'user' || m.role === 'assistant')
    )
    compressedHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content })
    })

    // 用户输入
    messages.push({ role: 'user', content: query })

    return messages
  }

  /**
   * 格式化车辆状态
   */
  private formatVehicleState(state: unknown): string {
    const s = state as Record<string, unknown>
    const parts: string[] = []

    if (s.ac) {
      const ac = s.ac as Record<string, unknown>
      parts.push(`空调: ${ac.isOn ? '开启' : '关闭'}, 温度 ${ac.temperature}°C`)
    }
    if (s.music) {
      const music = s.music as Record<string, unknown>
      parts.push(`音乐: ${music.isPlaying ? '播放中' : '暂停'}`)
    }
    if (s.navigation) {
      const nav = s.navigation as Record<string, unknown>
      if (nav.isActive) {
        parts.push(`导航: 目的地 ${nav.destination}`)
      }
    }

    return parts.join('\n')
  }

  /**
   * 加载系统 Prompt
   */
  private loadSystemPrompt(): string {
    const promptPath = path.join(__dirname, 'prompts', 'chat.md')
    try {
      return fs.readFileSync(promptPath, 'utf-8')
    } catch {
      return '你是一个智能座舱的语音助手，请友好自然地与用户对话。'
    }
  }
}

import type { ChatMessage } from '../../types/llm.js'
