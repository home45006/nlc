/**
 * SkillExecutor - Skill 能力执行器
 *
 * 负责执行 Skill 的具体能力，将意图和槽位转换为 Command
 *
 * 主要职责：
 * - 执行单个能力
 * - 槽位验证
 * - 指令生成
 * - 错误处理
 * - 脚本能力支持
 */

import type { Command } from '../../core/types.js'
import type { SkillContext, SkillResult, CapabilitySlot } from '../types.js'
import type { ScriptCapabilityExtension } from './types.js'
import {
  ScriptCapabilityHandler,
  createScriptCapabilityHandler,
  type ScriptHandlerConfig,
} from './script-capability-handler.js'

/**
 * 能力处理器函数类型
 */
export type CapabilityHandler = (
  slots: Record<string, unknown>,
  context: SkillContext
) => Promise<{
  success: boolean
  commands: Command[]
  ttsText?: string
  error?: string
}>

/**
 * Skill 能力定义（用于验证）
 */
export interface CapabilityDefinition {
  slots?: CapabilitySlot[]
}

/**
 * SkillExecutor 配置选项
 */
export interface SkillExecutorOptions {
  /** 是否启用槽位验证 */
  validateSlots?: boolean
  /** 是否启用脚本能力 */
  enableScripts?: boolean
  /** 脚本处理器配置 */
  scriptConfig?: ScriptHandlerConfig
}

/**
 * 执行请求
 */
export interface ExecutionRequest {
  skillId: string
  capability: string
  slots: Record<string, unknown>
  /** 脚本扩展配置（可选） */
  scriptExtension?: ScriptCapabilityExtension
}

/**
 * SkillExecutor 类
 *
 * 管理能力处理器的注册和执行
 */
export class SkillExecutor {
  private readonly capabilityHandlers: Map<string, Map<string, CapabilityHandler>> = new Map()
  private readonly capabilityDefinitions: Map<string, Map<string, CapabilityDefinition>> = new Map()
  private readonly scriptExtensions: Map<string, Map<string, ScriptCapabilityExtension>> = new Map()
  private readonly options: Required<Omit<SkillExecutorOptions, 'scriptConfig'>> & { scriptConfig?: ScriptHandlerConfig }
  private scriptHandler: ScriptCapabilityHandler | null = null

  constructor(
    handlers?: Record<string, Record<string, CapabilityHandler>>,
    definitions?: Record<string, Record<string, CapabilityDefinition>>,
    options?: SkillExecutorOptions
  ) {
    this.options = {
      validateSlots: options?.validateSlots ?? true,
      enableScripts: options?.enableScripts ?? true,
      scriptConfig: options?.scriptConfig,
    }

    // 注册传入的处理器
    if (handlers) {
      for (const [skillId, capabilities] of Object.entries(handlers)) {
        for (const [capability, handler] of Object.entries(capabilities)) {
          this.registerCapabilityHandler(skillId, capability, handler)
        }
      }
    }

    // 注册传入的定义
    if (definitions) {
      for (const [skillId, capabilities] of Object.entries(definitions)) {
        for (const [capability, definition] of Object.entries(capabilities)) {
          this.registerCapabilityDefinition(skillId, capability, definition)
        }
      }
    }

    // 初始化脚本处理器
    if (this.options.enableScripts && this.options.scriptConfig) {
      this.scriptHandler = createScriptCapabilityHandler(this.options.scriptConfig)
    }
  }

  /**
   * 执行单个能力
   *
   * @param skillId - Skill ID
   * @param capability - 能力名称
   * @param slots - 槽位参数
   * @param context - 执行上下文
   * @param scriptExtension - 脚本扩展配置（可选）
   * @returns 执行结果
   */
  async executeCapability(
    skillId: string,
    capability: string,
    slots: Record<string, unknown>,
    context: SkillContext,
    scriptExtension?: ScriptCapabilityExtension
  ): Promise<SkillResult> {
    // 优先检查脚本扩展
    const extension = scriptExtension ?? this.getScriptExtension(skillId, capability)
    if (extension && this.scriptHandler) {
      return this.executeScriptCapability(skillId, capability, slots, extension, context)
    }

    // 使用代码处理器
    const handler = this.getCapabilityHandler(skillId, capability)

    if (!handler) {
      return this.createErrorResult(
        `Unknown capability: ${skillId}.${capability}`,
        'UNKNOWN_CAPABILITY',
        capability,
        slots
      )
    }

    try {
      const result = await handler(slots, context)

      return {
        success: result.success,
        intent: capability,
        slots,
        commands: result.commands,
        ttsText: result.ttsText,
        confidence: 1.0,
        error: result.error,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return this.createErrorResult(errorMessage, 'EXECUTION_ERROR', capability, slots)
    }
  }

  /**
   * 执行脚本能力
   */
  private async executeScriptCapability(
    skillId: string,
    capability: string,
    slots: Record<string, unknown>,
    extension: ScriptCapabilityExtension,
    context: SkillContext
  ): Promise<SkillResult> {
    if (!this.scriptHandler) {
      return this.createErrorResult(
        'Script handler not initialized',
        'SCRIPT_NOT_INITIALIZED',
        capability,
        slots
      )
    }

    try {
      return await this.scriptHandler.handle(skillId, capability, slots, extension, context)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return this.createErrorResult(
        `Script execution error: ${errorMessage}`,
        'SCRIPT_ERROR',
        capability,
        slots
      )
    }
  }

  /**
   * 执行能力（带槽位验证）
   */
  async executeCapabilityWithValidation(
    skillId: string,
    capability: string,
    slots: Record<string, unknown>,
    context: SkillContext
  ): Promise<SkillResult> {
    // 验证槽位
    const definition = this.getCapabilityDefinition(skillId, capability)
    if (definition?.slots) {
      const validationError = this.validateSlots(definition.slots, slots)
      if (validationError) {
        return this.createErrorResult(validationError, 'VALIDATION_ERROR', capability, slots)
      }
    }

    return this.executeCapability(skillId, capability, slots, context)
  }

  /**
   * 并行执行多个能力
   *
   * @param requests - 执行请求列表
   * @param context - 执行上下文
   * @returns 所有执行结果
   */
  async executeMultipleCapabilities(
    requests: ExecutionRequest[],
    context: SkillContext
  ): Promise<SkillResult[]> {
    const promises = requests.map(req =>
      this.executeCapability(req.skillId, req.capability, req.slots, context)
    )

    return Promise.all(promises)
  }

  /**
   * 获取能力处理器
   */
  getCapabilityHandler(skillId: string, capability: string): CapabilityHandler | undefined {
    const skillHandlers = this.capabilityHandlers.get(skillId)
    return skillHandlers?.get(capability)
  }

  /**
   * 获取能力定义
   */
  getCapabilityDefinition(
    skillId: string,
    capability: string
  ): CapabilityDefinition | undefined {
    const skillDefs = this.capabilityDefinitions.get(skillId)
    return skillDefs?.get(capability)
  }

  /**
   * 注册能力处理器
   */
  registerCapabilityHandler(
    skillId: string,
    capability: string,
    handler: CapabilityHandler
  ): void {
    if (!this.capabilityHandlers.has(skillId)) {
      this.capabilityHandlers.set(skillId, new Map())
    }
    this.capabilityHandlers.get(skillId)!.set(capability, handler)
  }

  /**
   * 注册能力定义
   */
  registerCapabilityDefinition(
    skillId: string,
    capability: string,
    definition: CapabilityDefinition
  ): void {
    if (!this.capabilityDefinitions.has(skillId)) {
      this.capabilityDefinitions.set(skillId, new Map())
    }
    this.capabilityDefinitions.get(skillId)!.set(capability, definition)
  }

  /**
   * 批量注册能力处理器
   */
  registerCapabilityHandlers(
    skillId: string,
    capabilities: Record<string, CapabilityHandler>
  ): void {
    for (const [capability, handler] of Object.entries(capabilities)) {
      this.registerCapabilityHandler(skillId, capability, handler)
    }
  }

  /**
   * 移除能力处理器
   */
  removeCapabilityHandler(skillId: string, capability: string): boolean {
    const skillHandlers = this.capabilityHandlers.get(skillId)
    if (!skillHandlers) return false
    return skillHandlers.delete(capability)
  }

  /**
   * 注册脚本扩展
   */
  registerScriptExtension(
    skillId: string,
    capability: string,
    extension: ScriptCapabilityExtension
  ): void {
    if (!this.scriptExtensions.has(skillId)) {
      this.scriptExtensions.set(skillId, new Map())
    }
    this.scriptExtensions.get(skillId)!.set(capability, extension)
  }

  /**
   * 获取脚本扩展
   */
  getScriptExtension(
    skillId: string,
    capability: string
  ): ScriptCapabilityExtension | undefined {
    const skillExts = this.scriptExtensions.get(skillId)
    return skillExts?.get(capability)
  }

  /**
   * 清除所有处理器
   */
  clear(): void {
    this.capabilityHandlers.clear()
    this.capabilityDefinitions.clear()
    this.scriptExtensions.clear()
  }

  /**
   * 获取脚本处理器
   */
  getScriptHandler(): ScriptCapabilityHandler | null {
    return this.scriptHandler
  }

  /**
   * 验证槽位
   */
  private validateSlots(
    slotDefinitions: CapabilitySlot[],
    slots: Record<string, unknown>
  ): string | null {
    for (const slotDef of slotDefinitions) {
      if (slotDef.required) {
        const value = slots[slotDef.name]
        if (value === undefined || value === null || value === '') {
          return `Missing required slot: ${slotDef.name}`
        }
      }

      // 类型验证
      const value = slots[slotDef.name]
      if (value !== undefined && value !== null) {
        const typeError = this.validateSlotType(slotDef, value)
        if (typeError) {
          return typeError
        }
      }
    }

    return null
  }

  /**
   * 验证槽位类型
   */
  private validateSlotType(slotDef: CapabilitySlot, value: unknown): string | null {
    switch (slotDef.type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `Invalid type for slot ${slotDef.name}: expected number`
        }
        break

      case 'string':
        if (typeof value !== 'string') {
          return `Invalid type for slot ${slotDef.name}: expected string`
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Invalid type for slot ${slotDef.name}: expected boolean`
        }
        break

      case 'enum':
        if (slotDef.enumValues && !slotDef.enumValues.includes(value as string)) {
          return `Invalid value for slot ${slotDef.name}: must be one of ${slotDef.enumValues.join(', ')}`
        }
        break
    }

    return null
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(
    error: string,
    errorCode: string,
    intent: string,
    slots: Record<string, unknown>
  ): SkillResult {
    return {
      success: false,
      intent,
      slots,
      commands: [],
      error,
      errorCode,
      confidence: 0,
    }
  }
}

// 全局单例
let globalExecutor: SkillExecutor | null = null

/**
 * 获取全局 SkillExecutor 实例
 */
export function getGlobalSkillExecutor(): SkillExecutor {
  if (!globalExecutor) {
    globalExecutor = new SkillExecutor()
  }
  return globalExecutor
}

/**
 * 重置全局 SkillExecutor（用于测试）
 */
export function resetGlobalSkillExecutor(): void {
  globalExecutor = null
}
