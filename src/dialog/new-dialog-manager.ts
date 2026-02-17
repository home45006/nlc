/**
 * 对话管理器 (V2 架构 - FileBasedSkillOrchestrator)
 *
 * 使用 FileBasedSkillOrchestrator 作为核心处理引擎
 * 数据流：用户输入 → Orchestrator → Skill 执行 → 指令执行
 */

import type { ChatMessage, LLMProvider, StateChange } from '../types/index.js'
import type { Command } from '../core/types.js'
import type { OrchestrationResult } from '../skills/v2/file-based-orchestrator.js'
import { VehicleStateManager } from '../executor/vehicle-state.js'
import {
  FileBasedSkillOrchestrator,
  createFileBasedSkillOrchestrator,
} from '../skills/index.js'

// 对话历史最大条数
const MAX_HISTORY_MESSAGES = 5

export interface DialogResult {
  readonly output: {
    domain: string
    intent: string
    slots: Record<string, unknown>
    confidence: number
    ttsText: string
    hasCommand: boolean
    meta: {
      model: string
      latencyMs: number
    }
  }
  readonly stateChanges: ReadonlyArray<StateChange>
  /** 原始用户输入 */
  readonly originalInput?: string
  /** Orchestrator 完整结果 */
  readonly orchestrationResult?: OrchestrationResult
}

/**
 * 对话管理器 (V2 架构)
 */
export class NewDialogManager {
  private readonly orchestrator: FileBasedSkillOrchestrator
  private readonly stateManager: VehicleStateManager
  private history: ChatMessage[] = []
  private lastLatencyMs = 0
  private initialized = false

  constructor(provider: LLMProvider) {
    this.stateManager = new VehicleStateManager()

    // 创建 FileBasedSkillOrchestrator
    this.orchestrator = createFileBasedSkillOrchestrator(provider, {
      enableLogging: false,  // 生产环境关闭详细日志
      maxHistoryLength: MAX_HISTORY_MESSAGES,
    })

    console.log('[NewDialogManager] Created with FileBasedSkillOrchestrator')
  }

  /**
   * 初始化对话管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    await this.orchestrator.initialize()
    const skills = this.orchestrator.getSkills()

    console.log('[NewDialogManager] Initialized with skills:', skills.map(s => s.id).join(', '))
    this.initialized = true
  }

  /**
   * 处理用户输入
   */
  async handleInput(userInput: string): Promise<DialogResult> {
    // 确保已初始化
    if (!this.initialized) {
      await this.initialize()
    }

    const startTime = Date.now()
    const vehicleState = this.stateManager.getState()

    // 调用 Orchestrator 处理
    const result = await this.orchestrator.process(userInput, {
      vehicleState,
      dialogHistory: this.history,
    })

    // 执行指令并收集状态变更
    const stateChanges = this.executeCommands(result.commands)

    // 更新对话历史
    this.updateHistory(userInput, result.response)

    this.lastLatencyMs = Date.now() - startTime

    return {
      output: {
        domain: this.inferDomain(result),
        intent: result.intents?.[0]?.capability || result.skillResults[0]?.intent || 'unknown',
        slots: result.intents?.[0]?.slots || result.skillResults[0]?.slots || {},
        confidence: result.success ? 0.9 : 0.5,
        ttsText: result.response,
        hasCommand: result.commands.length > 0,
        meta: {
          model: 'file-based-skill-orchestrator',
          latencyMs: this.lastLatencyMs,
        },
      },
      stateChanges,
      originalInput: userInput,
      orchestrationResult: result,
    }
  }

  /**
   * 推断主要领域
   */
  private inferDomain(result: OrchestrationResult): string {
    // 从识别的意图推断
    const skillId = result.intents?.[0]?.skillId
    if (skillId) {
      return skillId
    }

    // 从 Skill 结果推断
    if (result.skillResults.length > 0) {
      const firstResult = result.skillResults[0]
      // 通过 commands 推断领域
      if (firstResult.commands.length > 0) {
        const cmdType = firstResult.commands[0].type
        if (cmdType.startsWith('ac_') || cmdType.startsWith('window_') ||
            cmdType.startsWith('seat_') || cmdType.startsWith('light_')) {
          return 'vehicle_control'
        }
        if (cmdType.startsWith('music_')) {
          return 'music'
        }
        if (cmdType.startsWith('nav_')) {
          return 'navigation'
        }
      }
    }

    return 'chat'
  }

  /**
   * 执行指令
   */
  private executeCommands(commands: Command[]): ReadonlyArray<StateChange> {
    const allChanges: StateChange[] = []

    for (const cmd of commands) {
      const changes = this.stateManager.applyCommand(cmd.type, cmd.params)
      allChanges.push(...changes)
    }

    return allChanges
  }

  /**
   * 更新对话历史
   */
  private updateHistory(userInput: string, response: string): void {
    // 添加用户输入
    this.history.push({ role: 'user', content: userInput })

    // 添加助手回复
    this.history.push({ role: 'assistant', content: response })

    // 修剪历史
    this.trimHistory()
  }

  /**
   * 获取对话历史
   */
  getHistory(): ReadonlyArray<ChatMessage> {
    return this.history
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.history = []
  }

  /**
   * 重置状态
   */
  resetState(): void {
    this.stateManager.reset()
    this.history = []
  }

  /**
   * 获取状态管理器
   */
  getStateManager(): VehicleStateManager {
    return this.stateManager
  }

  /**
   * 获取 Orchestrator
   */
  getOrchestrator(): FileBasedSkillOrchestrator {
    return this.orchestrator
  }

  /**
   * 修剪历史
   */
  private trimHistory(): void {
    if (this.history.length > MAX_HISTORY_MESSAGES * 2) {
      this.history = this.history.slice(-MAX_HISTORY_MESSAGES * 2)
    }
  }
}

/**
 * 为了兼容性，导出别名
 */
export { NewDialogManager as DialogManager }
