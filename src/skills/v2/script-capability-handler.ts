/**
 * 脚本能力处理器
 *
 * 将 Skill 能力调用转发到外部脚本执行
 */

import type { SkillContext, SkillResult } from '../types.js'
import type { ScriptConfig, ScriptResult as ExecResult } from './script-executor.js'
import type { ScriptCapabilityExtension } from './types.js'
import { ScriptExecutor, createScriptExecutor } from './script-executor.js'
import { ScriptConfigLoader, createScriptConfigLoader } from './script-config-loader.js'
import { SandboxManager, createSandboxManager } from './sandbox-manager.js'
import { InputValidator } from './input-validator.js'

/**
 * 处理器配置
 */
export interface ScriptHandlerConfig {
  /** Skills 根目录 */
  skillsRootDir: string
  /** 是否启用沙箱 */
  enableSandbox?: boolean
  /** 沙箱配置 */
  sandboxConfig?: ConstructorParameters<typeof SandboxManager>[0]
}

/**
 * 脚本能力处理器
 */
export class ScriptCapabilityHandler {
  private readonly executor: ScriptExecutor
  private readonly configLoader: ScriptConfigLoader
  private readonly sandboxManager?: SandboxManager
  private readonly enableSandbox: boolean
  private initialized = false

  constructor(config: ScriptHandlerConfig) {
    this.executor = createScriptExecutor(config.skillsRootDir)
    this.configLoader = createScriptConfigLoader(config.skillsRootDir)
    this.enableSandbox = config.enableSandbox ?? true

    if (this.enableSandbox) {
      this.sandboxManager = createSandboxManager(config.sandboxConfig)
    }
  }

  /**
   * 初始化处理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // 加载脚本配置
    const result = await this.configLoader.load()

    if (!result.success) {
      console.warn('[ScriptCapabilityHandler] 脚本配置加载有错误:', result.errors)
    }

    // 注册配置到执行器
    for (const config of result.configs) {
      this.executor.registerConfig(config)
    }

    if (result.warnings.length > 0) {
      console.warn('[ScriptCapabilityHandler] 警告:', result.warnings)
    }

    this.initialized = true
  }

  /**
   * 检查能力是否有脚本配置
   */
  hasScript(_skillId: string, capability: string): boolean {
    // 检查是否有对应的脚本配置
    const scripts = this.configLoader.findByCapability(capability)
    return scripts.length > 0
  }

  /**
   * 获取脚本配置
   */
  getScriptConfig(scriptId: string): ScriptConfig | undefined {
    return this.configLoader.getConfig(scriptId)
  }

  /**
   * 执行脚本能力
   */
  async handle(
    _skillId: string,
    capability: string,
    slots: Record<string, unknown>,
    scriptExtension: ScriptCapabilityExtension,
    _context: SkillContext
  ): Promise<SkillResult> {
    // 确保已初始化
    if (!this.initialized) {
      await this.initialize()
    }

    // 获取脚本配置
    const scriptConfig = this.configLoader.getConfig(scriptExtension.scriptId)
    if (!scriptConfig) {
      return {
        success: false,
        intent: capability,
        slots,
        commands: [],
        ttsText: '',
        error: `脚本配置未找到: ${scriptExtension.scriptId}`,
        confidence: 0,
      }
    }

    // 验证输入
    const validation = this.validateInput(slots, scriptExtension)
    if (!validation.valid) {
      return {
        success: false,
        intent: capability,
        slots,
        commands: [],
        ttsText: '',
        error: `输入验证失败: ${validation.errors.join(', ')}`,
        confidence: 0,
      }
    }

    // 构建执行参数
    const args = this.buildArgs(validation.sanitizedSlots ?? slots, scriptExtension)

    // 执行脚本
    let result: ExecResult
    try {
      if (this.enableSandbox && this.sandboxManager) {
        result = await this.sandboxManager.executeInSandbox(scriptConfig, { args })
      } else {
        result = await this.executor.execute(scriptConfig, { args })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        intent: capability,
        slots,
        commands: [],
        ttsText: '',
        error: `脚本执行错误: ${message}`,
        confidence: 0,
      }
    }

    // 处理结果
    return this.processResult(result, capability, slots, scriptExtension)
  }

  /**
   * 验证输入参数
   */
  private validateInput(
    slots: Record<string, unknown>,
    _extension: ScriptCapabilityExtension
  ): { valid: boolean; errors: string[]; sanitizedSlots?: Record<string, unknown> } {
    const errors: string[] = []
    const sanitizedSlots: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(slots)) {
      if (typeof value === 'string') {
        if (!InputValidator.isSafeString(value)) {
          errors.push(`参数 ${key} 包含不安全字符`)
        } else {
          sanitizedSlots[key] = InputValidator.sanitizeString(value)
        }
      } else {
        sanitizedSlots[key] = value
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedSlots,
    }
  }

  /**
   * 构建脚本参数
   */
  private buildArgs(
    slots: Record<string, unknown>,
    extension: ScriptCapabilityExtension
  ): string[] {
    const args: string[] = []
    const mapping = extension.inputMapping ?? {}

    for (const [slotName, slotValue] of Object.entries(slots)) {
      if (slotValue === undefined || slotValue === null) continue

      const argName = mapping[slotName] ?? `--${slotName}`

      if (typeof slotValue === 'boolean') {
        if (slotValue) {
          args.push(argName)
        }
      } else {
        args.push(argName, String(slotValue))
      }
    }

    return args
  }

  /**
   * 处理执行结果
   */
  private processResult(
    result: ExecResult,
    capability: string,
    slots: Record<string, unknown>,
    extension: ScriptCapabilityExtension
  ): SkillResult {
    if (!result.success) {
      return {
        success: false,
        intent: capability,
        slots,
        commands: [],
        ttsText: '',
        error: result.error ?? result.stderr ?? '脚本执行失败',
        confidence: 0,
      }
    }

    // 尝试解析 JSON 输出
    let outputData: Record<string, unknown> = {}
    try {
      if (result.stdout.trim().startsWith('{')) {
        outputData = JSON.parse(result.stdout)
      } else {
        outputData = { rawOutput: result.stdout }
      }
    } catch {
      outputData = { rawOutput: result.stdout }
    }

    // 格式化输出
    const ttsText = this.formatOutput(outputData, extension)

    return {
      success: true,
      intent: capability,
      slots,
      commands: [],
      ttsText,
      confidence: 1.0,
    }
  }

  /**
   * 格式化输出
   */
  private formatOutput(
    data: Record<string, unknown>,
    extension: ScriptCapabilityExtension
  ): string {
    // 如果有输出模板，使用模板格式化
    if (extension.outputTemplate) {
      let output = extension.outputTemplate
      for (const [key, value] of Object.entries(data)) {
        output = output.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? ''))
      }
      return output
    }

    // 否则返回原始 JSON 或文本
    if (data.rawOutput) {
      return String(data.rawOutput)
    }

    // 格式化 JSON
    const relevantFields = ['city', 'temperature', 'condition', 'result', 'error']
    const parts: string[] = []

    for (const field of relevantFields) {
      if (data[field] !== undefined) {
        parts.push(`${field}: ${data[field]}`)
      }
    }

    return parts.length > 0 ? parts.join(', ') : JSON.stringify(data)
  }

  /**
   * 获取执行器
   */
  getExecutor(): ScriptExecutor {
    return this.executor
  }

  /**
   * 获取配置加载器
   */
  getConfigLoader(): ScriptConfigLoader {
    return this.configLoader
  }
}

/**
 * 创建脚本能力处理器
 */
export function createScriptCapabilityHandler(config: ScriptHandlerConfig): ScriptCapabilityHandler {
  return new ScriptCapabilityHandler(config)
}
