/**
 * 上下文管理器
 *
 * 管理多轮对话的上下文
 */

import type { ChatMessage } from '../../types/llm.js'

/**
 * 对话上下文
 */
export interface ConversationContext {
  /** 主题 */
  topic?: string
  /** 关键实体 */
  entities: Map<string, unknown>
  /** 对话轮数 */
  turnCount: number
  /** 最后活跃时间 */
  lastActiveTime: number
}

/**
 * 上下文管理器
 */
export class ContextManager {
  private context: ConversationContext
  private readonly maxTurns: number
  private readonly contextTimeout: number

  constructor(options?: { maxTurns?: number; contextTimeout?: number }) {
    this.maxTurns = options?.maxTurns ?? 10
    this.contextTimeout = options?.contextTimeout ?? 300000 // 5 分钟
    this.context = this.createEmptyContext()
  }

  /**
   * 更新上下文
   */
  updateContext(message: ChatMessage): void {
    this.context.turnCount++
    this.context.lastActiveTime = Date.now()

    // 简单的主题提取
    if (message.role === 'user' && message.content) {
      this.extractTopic(message.content)
    }
  }

  /**
   * 获取当前上下文
   */
  getContext(): ConversationContext {
    // 检查是否超时
    if (Date.now() - this.context.lastActiveTime > this.contextTimeout) {
      this.reset()
    }
    return this.context
  }

  /**
   * 重置上下文
   */
  reset(): void {
    this.context = this.createEmptyContext()
  }

  /**
   * 压缩对话历史
   */
  compressHistory(history: ChatMessage[]): ChatMessage[] {
    if (history.length <= this.maxTurns) {
      return history
    }

    // 保留最近的对话
    const recentHistory = history.slice(-this.maxTurns)

    // 添加摘要（如果有较多历史）
    if (history.length > this.maxTurns) {
      const summary = this.generateSummary(history.slice(0, -this.maxTurns))
      return [
        { role: 'system', content: `之前的对话摘要：${summary}` },
        ...recentHistory,
      ]
    }

    return recentHistory
  }

  /**
   * 创建空上下文
   */
  private createEmptyContext(): ConversationContext {
    return {
      entities: new Map(),
      turnCount: 0,
      lastActiveTime: Date.now(),
    }
  }

  /**
   * 提取主题
   */
  private extractTopic(content: string): void {
    const topicKeywords: Record<string, string[]> = {
      music: ['歌', '音乐', '播放', '听'],
      navigation: ['导航', '去', '路线', '目的地'],
      vehicle: ['空调', '车窗', '座椅', '灯', '后备箱'],
      weather: ['天气', '雨', '晴', '冷', '热'],
    }

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        this.context.topic = topic
        break
      }
    }
  }

  /**
   * 生成摘要
   */
  private generateSummary(messages: ChatMessage[]): string {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('；')

    if (userMessages.length > 100) {
      return userMessages.slice(0, 100) + '...'
    }
    return userMessages
  }
}
