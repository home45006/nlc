/**
 * FileBasedSkillOrchestrator - 基于文件系统的 Skill 编排器
 *
 * 结合 FileBasedSkillRegistry 和 SkillExecutor，实现完整的 Skill 处理流程：
 * 1. 从文件系统加载 Skills
 * 2. 使用 LLM 识别意图
 * 3. 执行能力并返回结果
 *
 * 三层加载策略：
 * - 第一层：启动时加载 skill.yaml 元数据
 * - 第二层：意图识别后按需加载 SKILL.md 指令
 * - 第三层：执行时使用能力处理器
 */

import type { LLMProvider, ChatMessage } from '../../types/llm.js'
import type { VehicleState } from '../../types/vehicle.js'
import type { Command } from '../../core/types.js'
import type {
  Skill,
  SkillContext,
  SkillResult,
  SkillInput,
  RecognizedIntent,
  IntentRecognitionResult,
} from '../types.js'
import { FileBasedSkillRegistry } from './file-based-skill-registry.js'
import { SkillExecutor, type CapabilityHandler } from './skill-executor.js'

/**
 * Orchestrator 配置选项
 */
export interface FileBasedOrchestratorOptions {
  /** Skills 目录路径 */
  skillsDirectory?: string
  /** 最大意图数量 */
  maxIntents?: number
  /** 最大对话历史条数 */
  maxHistoryLength?: number
  /** 是否启用详细日志 */
  enableLogging?: boolean
  /** 是否展示 LLM 思考过程 */
  showThinking?: boolean
}

/**
 * Orchestrator 执行上下文
 */
export interface OrchestratorContext {
  /** 当前车辆状态 */
  vehicleState: VehicleState
  /** 对话历史 */
  dialogHistory: ChatMessage[]
  /** 上一个处理的领域 */
  previousDomain?: string
  /** 当前查询 */
  currentQuery?: string
}

/**
 * 编排结果
 */
export interface OrchestrationResult {
  /** 是否成功 */
  success: boolean
  /** LLM 回复文本 */
  response: string
  /** Skill 执行结果列表 */
  skillResults: SkillResult[]
  /** 汇总的指令列表 */
  commands: Command[]
  /** 识别的意图列表 */
  intents?: RecognizedIntent[]
  /** 错误信息 */
  error?: string
}

/**
 * 基于文件系统的 Skill Orchestrator
 */
export class FileBasedSkillOrchestrator {
  private readonly registry: FileBasedSkillRegistry
  private readonly executor: SkillExecutor
  private readonly provider: LLMProvider
  private readonly options: Required<FileBasedOrchestratorOptions>
  private skills: Skill[] = []
  private initialized = false

  constructor(provider: LLMProvider, options?: FileBasedOrchestratorOptions) {
    this.provider = provider
    this.registry = new FileBasedSkillRegistry()
    this.executor = new SkillExecutor()
    this.options = {
      skillsDirectory: options?.skillsDirectory || process.env.SKILLS_DIR || 'skills',
      maxIntents: options?.maxIntents ?? 5,
      maxHistoryLength: options?.maxHistoryLength ?? 5,
      enableLogging: options?.enableLogging ?? false,
      showThinking: options?.showThinking ?? true,
    }
  }

  /**
   * 初始化 Orchestrator
   *
   * 第一层加载：扫描并加载所有 Skill 元数据
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    await this.registry.scanSkillsDirectory(this.options.skillsDirectory)
    this.skills = this.registry.getAllSkills()

    // 注册能力处理器
    this.registerCapabilityHandlers()

    this.initialized = true

    if (this.options.enableLogging) {
      console.log(`[FileBasedSkillOrchestrator] Initialized with ${this.skills.length} skills`)
    }
  }

  /**
   * 注册能力处理器
   *
   * 将 FileBasedSkill 的 execute 方法注册到 SkillExecutor
   */
  private registerCapabilityHandlers(): void {
    for (const skill of this.skills) {
      // 为每个能力创建处理器
      for (const capability of skill.capabilities) {
        const handler: CapabilityHandler = async (slots, context) => {
          const input: SkillInput = {
            originalQuery: '',
            rewrittenQuery: '',
            confidence: 1.0,
            contextInfo: {
              relatedEntities: {
                capability: capability.name,
                ...slots,
              },
            },
          }
          const result = await skill.execute(input, context)
          return {
            success: result.success,
            commands: [...result.commands],
            ttsText: result.ttsText,
            error: result.error,
          }
        }

        this.executor.registerCapabilityHandler(skill.id, capability.name, handler)
      }
    }
  }

  /**
   * 处理用户输入
   */
  async process(
    userQuery: string,
    context: OrchestratorContext
  ): Promise<OrchestrationResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      // 1. LLM 意图识别
      const recognitionResult = await this.recognizeIntents(userQuery, context)

      // 检查识别结果
      if (!recognitionResult.success || recognitionResult.intents.length === 0) {
        // 无意图，使用 Chat 处理
        return this.handleAsChat(userQuery, context)
      }

      // 限制意图数量
      const intents = recognitionResult.intents.slice(0, this.options.maxIntents)

      // 2. 并行执行 Skills
      const skillResults = await this.executeIntents(intents, context, userQuery)

      // 3. 汇总结果
      const allCommands = skillResults.flatMap(r => r.commands)
      const response = this.generateSummaryResponse(intents, skillResults)

      return {
        success: true,
        response,
        skillResults,
        commands: allCommands,
        intents,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        response: '抱歉，处理您的请求时出现了问题。',
        skillResults: [],
        commands: [],
        error: errorMessage,
      }
    }
  }

  /**
   * 意图识别
   */
  private async recognizeIntents(
    userQuery: string,
    context: OrchestratorContext
  ): Promise<IntentRecognitionResult> {
    const messages: ChatMessage[] = [
      { role: 'system', content: await this.buildIntentRecognitionPrompt() },
    ]

    // 添加车辆状态上下文
    messages.push({
      role: 'user',
      content: this.buildContextMessage(context.vehicleState),
    })

    // 添加对话历史
    if (context.dialogHistory.length > 0) {
      const history = context.dialogHistory.slice(-this.options.maxHistoryLength)
      messages.push(...history)
    }

    // 添加当前查询
    messages.push({ role: 'user', content: userQuery })

    const response = await this.provider.chat({
      messages,
      temperature: 0.1,
      maxTokens: 2000,
    })

    return this.parseIntentResponse(response.content || '')
  }

  /**
   * 解析意图识别响应
   */
  private parseIntentResponse(content: string): IntentRecognitionResult {
    try {
      // 提取 JSON 块
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : content

      const parsed = JSON.parse(jsonStr.trim())

      if (!Array.isArray(parsed.intents)) {
        return {
          success: false,
          intents: [],
          error: 'Invalid response format: missing intents array',
        }
      }

      const intents: RecognizedIntent[] = parsed.intents.map((intent: Record<string, unknown>) => ({
        skillId: String(intent.skillId || ''),
        capability: String(intent.capability || ''),
        slots: (intent.slots as Record<string, unknown>) || {},
        confidence: Number(intent.confidence) || 0.5,
      }))

      return {
        success: true,
        intents,
        reasoning: parsed.reasoning,
      }
    } catch (error) {
      return {
        success: false,
        intents: [],
        error: `Failed to parse intent response: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * 执行意图列表
   */
  private async executeIntents(
    intents: RecognizedIntent[],
    context: OrchestratorContext,
    originalQuery: string
  ): Promise<SkillResult[]> {
    const results: SkillResult[] = []

    for (const intent of intents) {
      const result = await this.executor.executeCapability(
        intent.skillId,
        intent.capability,
        intent.slots,
        {
          vehicleState: context.vehicleState,
          dialogHistory: context.dialogHistory,
          previousDomain: context.previousDomain as SkillContext['previousDomain'],
        }
      )
      results.push({
        ...result,
        confidence: intent.confidence,
      })
    }

    return results
  }

  /**
   * 使用 Chat 处理（无意图时）
   */
  private async handleAsChat(
    userQuery: string,
    context: OrchestratorContext
  ): Promise<OrchestrationResult> {
    const chatSkill = this.skills.find(s => s.id === 'chat')

    if (!chatSkill) {
      return {
        success: true,
        response: '我暂时无法理解您的请求，请换个方式说说看。',
        skillResults: [],
        commands: [],
      }
    }

    const result = await this.executor.executeCapability(
      'chat',
      'general_chat',
      { query: userQuery },
      {
        vehicleState: context.vehicleState,
        dialogHistory: context.dialogHistory,
        previousDomain: context.previousDomain as SkillContext['previousDomain'],
      }
    )

    return {
      success: true,
      response: result.ttsText || '',
      skillResults: [result],
      commands: [],
      intents: [],
    }
  }

  /**
   * 生成汇总响应
   */
  private generateSummaryResponse(
    _intents: RecognizedIntent[],
    results: SkillResult[]
  ): string {
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    if (successCount === totalCount) {
      const ttsTexts = results.filter(r => r.ttsText).map(r => r.ttsText)
      if (ttsTexts.length > 0) {
        return ttsTexts.join('，')
      }
      return `好的，已为您处理 ${totalCount} 个请求。`
    } else if (successCount === 0) {
      return '抱歉，处理您的请求时遇到了问题。'
    } else {
      return `已处理 ${successCount}/${totalCount} 个请求，部分操作未成功。`
    }
  }

  /**
   * 构建意图识别 Prompt
   */
  private async buildIntentRecognitionPrompt(): Promise<string> {
    const capabilityDescriptions = await this.registry.getCapabilityDescriptions()

    return `# 智能座舱助手 - 意图识别

你是一个智能座舱助手。分析用户输入，识别意图并提取实体。

## 可用能力

${capabilityDescriptions}

## 输出格式

返回 JSON 格式（包含在 \`\`\`json 代码块中）：

\`\`\`json
{
  "reasoning": "分析用户输入...",
  "intents": [
    {
      "skillId": "vehicle_control",
      "capability": "ac_control",
      "slots": { "action": "turn_on", "temperature": 24 },
      "confidence": 0.95
    }
  ]
}
\`\`\`

## 重要规则

1. **多意图**：用户的请求可能包含多个意图，每个意图返回一个对象
2. **槽位提取**：根据用户输入提取相应的参数
3. **置信度**：0.9+ 非常确定，0.7-0.9 比较确定，0.5-0.7 有些不确定
4. **无法识别时**：返回空 intents 数组，系统会使用 Chat 处理`
  }

  /**
   * 构建车辆状态上下文消息
   */
  private buildContextMessage(state: VehicleState): string {
    return `[当前车辆状态]
${JSON.stringify(state, null, 2)}`
  }

  /**
   * 获取能力描述（用于 Prompt）
   */
  async getCapabilityDescriptions(skillIds?: string[]): Promise<string> {
    return this.registry.getCapabilityDescriptions(skillIds)
  }

  /**
   * 获取已注册的 Skills
   */
  getSkills(): Skill[] {
    return this.skills
  }

  /**
   * 获取 Registry（用于高级操作）
   */
  getRegistry(): FileBasedSkillRegistry {
    return this.registry
  }

  /**
   * 获取 Executor（用于高级操作）
   */
  getExecutor(): SkillExecutor {
    return this.executor
  }
}

/**
 * 创建 FileBasedSkillOrchestrator
 */
export function createFileBasedSkillOrchestrator(
  provider: LLMProvider,
  options?: FileBasedOrchestratorOptions
): FileBasedSkillOrchestrator {
  return new FileBasedSkillOrchestrator(provider, options)
}
