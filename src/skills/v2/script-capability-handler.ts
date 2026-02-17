/**
 * 脚本能力处理器
 *
 * 将 Skill 能力调用转发到外部脚本执行
 */

import { resolve } from 'node:path'
import type { LLMProvider } from '../../types/llm.js'
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
  /** LLM Provider（用于润色脚本输出） */
  llmProvider?: LLMProvider
}

/**
 * Skill 脚本目录信息
 */
export interface SkillScriptDir {
  /** Skill ID */
  readonly skillId: string
  /** 脚本配置目录的绝对或相对路径 */
  readonly scriptsDir: string
}

/**
 * 脚本能力处理器
 */
export class ScriptCapabilityHandler {
  private readonly executors: Map<string, ScriptExecutor> = new Map()
  private readonly configLoaders: Map<string, ScriptConfigLoader> = new Map()
  private readonly sandboxManager?: SandboxManager
  private readonly enableSandbox: boolean
  private fallbackInitialized = false
  private skillsInitialized = false
  /** 全局 fallback 配置加载器（兼容旧逻辑） */
  private readonly fallbackConfigLoader: ScriptConfigLoader
  private readonly fallbackExecutor: ScriptExecutor
  /** LLM Provider（用于润色脚本输出） */
  private readonly llmProvider?: LLMProvider

  constructor(config: ScriptHandlerConfig) {
    this.fallbackExecutor = createScriptExecutor(config.skillsRootDir)
    this.fallbackConfigLoader = createScriptConfigLoader(config.skillsRootDir)
    this.enableSandbox = config.enableSandbox ?? true
    this.llmProvider = config.llmProvider

    if (this.enableSandbox) {
      this.sandboxManager = createSandboxManager(config.sandboxConfig)
    }
  }

  /**
   * 初始化处理器（兼容旧逻辑，从 skillsRootDir 加载）
   */
  async initialize(): Promise<void> {
    if (this.fallbackInitialized) return

    // 加载全局脚本配置（兼容）
    const result = await this.fallbackConfigLoader.load()

    if (!result.success) {
      console.warn('[ScriptCapabilityHandler] 脚本配置加载有错误:', result.errors)
    }

    // 注册配置到 fallback 执行器
    for (const config of result.configs) {
      this.fallbackExecutor.registerConfig(config)
    }

    // 仅输出非"文件不存在"的警告（fallback 无配置文件是正常情况）
    const significantWarnings = result.warnings.filter(w => !w.includes('脚本配置文件不存在'))
    if (significantWarnings.length > 0) {
      console.warn('[ScriptCapabilityHandler] 警告:', significantWarnings)
    }

    this.fallbackInitialized = true
  }

  /**
   * 为多个 skill 目录初始化脚本配置
   *
   * 每个 skill 可以有独立的 scripts 目录和 scripts.yaml
   */
  async initializeForSkills(skillScriptDirs: ReadonlyArray<SkillScriptDir>): Promise<void> {
    if (this.skillsInitialized) return

    for (const { skillId, scriptsDir } of skillScriptDirs) {
      const loader = createScriptConfigLoader(scriptsDir)
      const result = await loader.load()

      if (!result.success) {
        console.warn(`[ScriptCapabilityHandler] skill ${skillId} 脚本配置加载有错误:`, result.errors)
      }

      // 为该 skill 创建独立的执行器（以脚本目录为基准）
      const executor = createScriptExecutor(scriptsDir)

      // 注册配置到对应执行器
      for (const config of result.configs) {
        executor.registerConfig(config)
      }

      if (result.warnings.length > 0) {
        console.warn(`[ScriptCapabilityHandler] skill ${skillId} 警告:`, result.warnings)
      }

      this.configLoaders.set(skillId, loader)
      this.executors.set(skillId, executor)
    }

    // 同时加载 fallback（兼容没有 scriptsDir 的 skill）
    await this.initialize()

    this.skillsInitialized = true
  }

  /**
   * 检查能力是否有脚本配置
   */
  hasScript(skillId: string, capability: string): boolean {
    // 优先查找该 skill 专属的配置加载器
    const loader = this.configLoaders.get(skillId)
    if (loader) {
      return loader.findByCapability(capability).length > 0
    }
    // fallback 到全局加载器
    return this.fallbackConfigLoader.findByCapability(capability).length > 0
  }

  /**
   * 获取脚本配置
   */
  getScriptConfig(scriptId: string, skillId?: string): ScriptConfig | undefined {
    // 优先从 skill 专属加载器查找
    if (skillId) {
      const loader = this.configLoaders.get(skillId)
      if (loader) {
        const config = loader.getConfig(scriptId)
        if (config) return config
      }
    }
    // 遍历所有 skill 加载器查找
    for (const loader of this.configLoaders.values()) {
      const config = loader.getConfig(scriptId)
      if (config) return config
    }
    // fallback 到全局加载器
    return this.fallbackConfigLoader.getConfig(scriptId)
  }

  /**
   * 执行脚本能力
   */
  async handle(
    skillId: string,
    capability: string,
    slots: Record<string, unknown>,
    scriptExtension: ScriptCapabilityExtension,
    _context: SkillContext
  ): Promise<SkillResult> {
    // 确保 fallback 已初始化
    if (!this.fallbackInitialized) {
      await this.initialize()
    }

    // 获取脚本配置（优先从 skill 专属加载器查找）
    const scriptConfig = this.getScriptConfig(scriptExtension.scriptId, skillId)
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

    // 选择对应的执行器（优先 skill 专属，fallback 到全局）
    const executor = this.executors.get(skillId) ?? this.fallbackExecutor

    // 执行脚本
    let result: ExecResult
    try {
      if (this.enableSandbox && this.sandboxManager) {
        // 沙箱模式：需要将相对路径解析为绝对路径
        // ScriptExecutor 内部有 scriptsBasePath，但 SandboxManager 没有
        // 因此在这里构造带绝对路径的配置
        const resolvedConfig = {
          ...scriptConfig,
          path: resolve(executor.getScriptsBasePath(), scriptConfig.path),
        }
        result = await this.sandboxManager.executeInSandbox(resolvedConfig, { args })
      } else {
        result = await executor.execute(scriptConfig, { args })
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
    return await this.processResult(result, capability, slots, scriptExtension)
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
  private async processResult(
    result: ExecResult,
    capability: string,
    slots: Record<string, unknown>,
    extension: ScriptCapabilityExtension
  ): Promise<SkillResult> {
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
    let ttsText = this.formatOutput(outputData, extension)

    // 如果需要 LLM 润色
    if (extension.summarizeWithLlm && this.llmProvider) {
      try {
        ttsText = await this.llmSummarize(ttsText, capability)
      } catch (error) {
        console.warn('[ScriptCapabilityHandler] LLM 润色失败，使用原始输出:', error)
      }
    }

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
   * 使用 LLM 润色脚本输出
   */
  private async llmSummarize(rawOutput: string, _capability: string): Promise<string> {
    if (!this.llmProvider) {
      return rawOutput
    }

    const prompt = `你是一个车载语音助手，需要将脚本执行结果用自然、友好的方式表达出来。

脚本执行结果：
${rawOutput}

请将上述结果用简洁、自然的车载语音播报形式返回（50字以内）。直接返回播报内容，不需要引号或其他装饰。`

    const response = await this.llmProvider.chat({
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      maxTokens: 256,
    })

    return response.content ?? rawOutput
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
   * 获取执行器（指定 skill 或 fallback）
   */
  getExecutor(skillId?: string): ScriptExecutor {
    if (skillId) {
      const executor = this.executors.get(skillId)
      if (executor) return executor
    }
    return this.fallbackExecutor
  }

  /**
   * 获取配置加载器（指定 skill 或 fallback）
   */
  getConfigLoader(skillId?: string): ScriptConfigLoader {
    if (skillId) {
      const loader = this.configLoaders.get(skillId)
      if (loader) return loader
    }
    return this.fallbackConfigLoader
  }
}

/**
 * 创建脚本能力处理器
 */
export function createScriptCapabilityHandler(config: ScriptHandlerConfig): ScriptCapabilityHandler {
  return new ScriptCapabilityHandler(config)
}
