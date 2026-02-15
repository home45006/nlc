/**
 * 对话管理器 (新架构)
 *
 * 使用大模型作为中枢控制器的对话管理器
 * 数据流：用户输入 → 中枢控制器(落域+改写) → 领域路由 → 领域处理器 → 指令执行
 */

import type { ChatMessage, DialogOutput, LLMProvider, StateChange } from '../types/index.js'
import type { DomainType } from '../types/domain.js'
import type {
  MultiIntentRouting,
  DomainContext,
  DomainResult,
  Command,
} from '../core/types.js'
import { CentralControllerImpl } from '../controller/central-controller.js'
import { DomainRouterImpl } from '../controller/domain-router.js'
import { createAllHandlers } from '../domains/index.js'
import { VehicleStateManager } from '../executor/vehicle-state.js'

const MAX_HISTORY_MESSAGES = 60

export interface DialogResult {
  readonly output: DialogOutput
  readonly stateChanges: ReadonlyArray<StateChange>
}

/**
 * 对话管理器 (新架构)
 */
export class NewDialogManager {
  private centralController: CentralControllerImpl
  private domainRouter: DomainRouterImpl
  private readonly stateManager: VehicleStateManager
  private history: ChatMessage[] = []
  private lastLatencyMs = 0
  private lastTokens = { prompt: 0, completion: 0 }

  constructor(provider: LLMProvider) {
    this.centralController = new CentralControllerImpl(provider)
    this.domainRouter = new DomainRouterImpl()
    this.stateManager = new VehicleStateManager()

    // 注册所有领域处理器
    const handlers = createAllHandlers(provider)
    handlers.forEach(handler => this.domainRouter.registerHandler(handler))

    console.log('[NewDialogManager] Initialized with domains:',
      this.domainRouter.getRegisteredDomains().join(', '))
  }

  /**
   * 处理用户输入
   */
  async handleInput(userInput: string): Promise<DialogResult> {
    const startTime = Date.now()
    const vehicleState = this.stateManager.getState()

    // Step 1: 中枢控制器进行落域识别和 Query 改写
    const routing = await this.centralController.route(userInput, {
      vehicleState,
      dialogHistory: this.history,
    })

    console.log('[NewDialogManager] Routing result:', routing.routings.map(r =>
      `${r.domain}:${r.confidence.toFixed(2)}`
    ).join(', '))

    // Step 2: 构建领域上下文
    const domainContext: DomainContext = {
      vehicleState,
      dialogHistory: this.history,
      previousDomain: this.getLastDomain(),
    }

    // Step 3: 领域路由分发
    const domainResults = await this.domainRouter.dispatchAll(routing.routings, domainContext)

    // Step 4: 执行指令
    const allCommands = this.collectCommands(domainResults)
    const stateChanges = this.executeCommands(allCommands)

    // Step 5: 生成输出
    const ttsText = this.generateTtsText(domainResults, stateChanges)
    const primaryResult = domainResults[0]

    // Step 6: 更新历史
    this.updateHistory(userInput, routing, domainResults, ttsText)

    this.lastLatencyMs = Date.now() - startTime

    return {
      output: {
        domain: routing.routings[0]?.domain || 'chat',
        intent: primaryResult?.intent || 'unknown',
        slots: primaryResult?.slots || {},
        confidence: routing.overallConfidence,
        ttsText,
        hasCommand: allCommands.length > 0,
        meta: {
          model: 'multi-stage',
          latencyMs: this.lastLatencyMs,
          tokens: this.lastTokens,
        },
      },
      stateChanges,
    }
  }

  /**
   * 收集所有指令
   */
  private collectCommands(results: ReadonlyArray<DomainResult>): Command[] {
    const commands: Command[] = []
    for (const result of results) {
      if (result.commands) {
        commands.push(...result.commands)
      }
    }
    return commands
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
   * 生成 TTS 文本
   */
  private generateTtsText(
    results: ReadonlyArray<DomainResult>,
    stateChanges: ReadonlyArray<StateChange>
  ): string {
    // 优先使用领域处理器返回的 TTS
    const ttsTexts = results
      .filter(r => r.ttsText)
      .map(r => r.ttsText as string)

    if (ttsTexts.length > 0) {
      return ttsTexts.join('。')
    }

    // 兜底：基于状态变更生成
    if (stateChanges.length > 0) {
      return `好的，${stateChanges.map(c => `${c.field}已调整为${c.to}`).join('，')}。`
    }

    return '好的'
  }

  /**
   * 更新对话历史
   */
  private updateHistory(
    userInput: string,
    _routing: MultiIntentRouting,
    _results: ReadonlyArray<DomainResult>,
    ttsText: string
  ): void {
    // 添加用户输入
    this.history.push({ role: 'user', content: userInput })

    // 添加助手回复
    this.history.push({ role: 'assistant', content: ttsText })

    // 修剪历史
    this.trimHistory()
  }

  /**
   * 获取最后一个交互的领域
   */
  private getLastDomain(): DomainType | undefined {
    // 从历史中找最后一个 assistant 消息对应的领域
    // 简化实现：返回 undefined
    return undefined
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
   * 切换 Provider
   */
  switchProvider(provider: LLMProvider): void {
    // 重新创建中枢控制器
    this.centralController = new CentralControllerImpl(provider)

    // 重新创建领域路由器并注册处理器
    this.domainRouter = new DomainRouterImpl()
    const handlers = createAllHandlers(provider)
    handlers.forEach(handler => this.domainRouter.registerHandler(handler))

    console.log('[NewDialogManager] Provider switched')
  }

  /**
   * 获取状态管理器
   */
  getStateManager(): VehicleStateManager {
    return this.stateManager
  }

  /**
   * 修剪历史
   */
  private trimHistory(): void {
    if (this.history.length > MAX_HISTORY_MESSAGES) {
      this.history = this.history.slice(-MAX_HISTORY_MESSAGES)
    }
  }
}

/**
 * 为了兼容性，导出别名
 */
export { NewDialogManager as DialogManager }
