/**
 * Skill 核心类型定义
 *
 * 定义 Skill 系统的核心接口和类型，支持：
 * - 渐进式披露（通过 capabilities）
 * - 模块独立封装
 * - 统一接口规范
 * - 动态注册发现
 */

import type { DomainType } from '../types/domain.js'
import type { VehicleState } from '../types/vehicle.js'
import type { ChatMessage } from '../types/llm.js'
import type { Command, RoutingContextInfo } from '../core/types.js'

// ============== Skill 能力描述 ==============

/**
 * 能力槽位定义
 */
export interface CapabilitySlot {
  /** 槽位名称 */
  readonly name: string
  /** 槽位类型 */
  readonly type: 'string' | 'number' | 'boolean' | 'enum'
  /** 是否必需 */
  readonly required: boolean
  /** 枚举值（当 type 为 enum 时） */
  readonly enumValues?: ReadonlyArray<string>
  /** 描述 */
  readonly description?: string
}

/**
 * Skill 能力描述
 *
 * 用于渐进式披露，让中枢控制器了解 Skill 能做什么
 */
export interface SkillCapability {
  /** 能力名称（唯一标识） */
  readonly name: string
  /** 能力描述 */
  readonly description: string
  /** 示例语句 */
  readonly examples: ReadonlyArray<string>
  /** 槽位定义（可选） */
  readonly slots?: ReadonlyArray<CapabilitySlot>
  /** 关键词（用于快速匹配） */
  readonly keywords?: ReadonlyArray<string>
}

// ============== Skill 元数据 ==============

/**
 * Skill 元数据
 */
export interface SkillMetadata {
  /** 版本号 */
  readonly version?: string
  /** 作者 */
  readonly author?: string
  /** 标签 */
  readonly tags?: ReadonlyArray<string>
  /** 优先级（数字越小优先级越高） */
  readonly priority?: number
  /** 是否启用 */
  readonly enabled?: boolean
  /** 依赖的其他 Skill ID */
  readonly dependencies?: ReadonlyArray<string>
}

// ============== Skill 输入输出 ==============

/**
 * Skill 输入
 */
export interface SkillInput {
  /** 原始用户查询 */
  readonly originalQuery: string
  /** 改写后的查询（包含上下文信息） */
  readonly rewrittenQuery: string
  /** 路由置信度 (0-1) */
  readonly confidence: number
  /** 路由上下文信息 */
  readonly contextInfo?: RoutingContextInfo
}

/**
 * Skill 执行上下文
 */
export interface SkillContext {
  /** 当前车辆状态 */
  readonly vehicleState: VehicleState
  /** 对话历史 */
  readonly dialogHistory: ReadonlyArray<ChatMessage>
  /** 上一个处理的领域 */
  readonly previousDomain?: DomainType
}

/**
 * Skill 执行结果
 */
export interface SkillResult {
  /** 是否成功 */
  readonly success: boolean
  /** 识别出的意图 */
  readonly intent: string
  /** 提取的槽位/实体 */
  readonly slots: Record<string, unknown>
  /** 要执行的指令列表 */
  readonly commands: ReadonlyArray<Command>
  /** TTS 回复文本（可选） */
  readonly ttsText?: string
  /** 是否需要继续处理下一个 Skill */
  readonly shouldContinue?: boolean
  /** 置信度 (0-1) */
  readonly confidence: number
  /** 错误信息（失败时） */
  readonly error?: string
  /** 错误码（可选） */
  readonly errorCode?: string
}

// ============== Skill 接口 ==============

/**
 * Skill 接口
 *
 * 所有 Skill 必须实现此接口
 */
export interface Skill {
  /** Skill 唯一标识 */
  readonly id: string
  /** Skill 显示名称 */
  readonly name: string
  /** Skill 描述 */
  readonly description: string
  /** 所属领域 */
  readonly domain: DomainType
  /** 能力列表（用于渐进式披露） */
  readonly capabilities: ReadonlyArray<SkillCapability>
  /** 元数据（可选） */
  readonly metadata?: SkillMetadata

  /**
   * 执行 Skill
   *
   * @param input - 输入信息
   * @param context - 执行上下文
   * @returns 执行结果
   */
  execute(input: SkillInput, context: SkillContext): Promise<SkillResult>
}

// ============== Skill 工厂类型 ==============

/**
 * Skill 工厂函数类型
 */
export type SkillFactory = () => Skill

/**
 * Skill 配置选项
 */
export interface SkillOptions {
  /** 是否启用旁路模式（跳过意图提取） */
  readonly bypassMode?: boolean
  /** 最小置信度阈值 */
  readonly minConfidence?: number
  /** 自定义配置 */
  readonly config?: Record<string, unknown>
}

// ============== 意图识别类型 ==============

/**
 * 识别出的单个意图
 */
export interface RecognizedIntent {
  /** 目标 Skill ID */
  readonly skillId: string
  /** 能力/意图名称 */
  readonly capability: string
  /** 提取的实体/参数 */
  readonly slots: Record<string, unknown>
  /** 置信度 (0-1) */
  readonly confidence: number
}

/**
 * LLM 意图识别结果
 */
export interface IntentRecognitionResult {
  /** 是否成功 */
  readonly success: boolean
  /** 识别出的意图列表 */
  readonly intents: ReadonlyArray<RecognizedIntent>
  /** 推理过程（可选） */
  readonly reasoning?: string
  /** 错误信息（失败时） */
  readonly error?: string
}
