/**
 * Skill V2 类型定义
 *
 * 文件系统级 Skills 的类型系统，支持：
 * - skill.yaml 元数据
 * - SKILL.md 指令
 * - capabilities.json 能力定义（可选）
 */

import type { DomainType } from '../../types/domain.js'
import type { Skill, SkillCapability, CapabilitySlot } from '../types.js'

// ============== YAML 元数据类型 ==============

/**
 * 槽位定义（用于 skill.yaml）
 */
export interface SlotDefinition {
  /** 槽位名称 */
  readonly name: string
  /** 槽位类型 */
  readonly type: 'string' | 'number' | 'boolean' | 'enum'
  /** 是否必需 */
  readonly required?: boolean
  /** 枚举值（当 type 为 enum 时必需） */
  readonly enumValues?: ReadonlyArray<string>
  /** 描述 */
  readonly description?: string
  /** 最小值（number 类型） */
  readonly min?: number
  /** 最大值（number 类型） */
  readonly max?: number
}

/**
 * 能力定义（用于 skill.yaml）
 */
export interface CapabilityDefinition {
  /** 能力名称（唯一标识） */
  readonly name: string
  /** 能力描述 */
  readonly description: string
  /** 示例语句 */
  readonly examples?: ReadonlyArray<string>
  /** 槽位定义 */
  readonly slots?: ReadonlyArray<SlotDefinition>
  /** 关键词（用于快速匹配） */
  readonly keywords?: ReadonlyArray<string>
  /** 脚本扩展配置 */
  readonly script?: ScriptCapabilityExtension
}

/**
 * 脚本能力扩展配置
 */
export interface ScriptCapabilityExtension {
  /** 关联的脚本 ID */
  readonly scriptId: string
  /** 输入参数映射（槽位名 -> 脚本参数名） */
  readonly inputMapping?: Record<string, string>
  /** 输出格式化模板 */
  readonly outputTemplate?: string
  /** 是否将结果传递给 LLM 进行总结 */
  readonly summarizeWithLlm?: boolean
}

/**
 * skill.yaml 元数据结构
 *
 * 第一层加载：轻量级元数据，启动时全部加载到内存
 * 预估大小：~50 tokens per skill
 */
export interface SkillMetadataYaml {
  // ============== 必需字段 ==============

  /** Skill 唯一标识 */
  readonly id: string
  /** Skill 显示名称 */
  readonly name: string
  /** Skill 描述 */
  readonly description: string
  /** 所属领域 */
  readonly domain: DomainType

  // ============== 可选字段 ==============

  /** 版本号 */
  readonly version?: string
  /** 作者 */
  readonly author?: string
  /** 优先级（数字越小优先级越高，默认 100） */
  readonly priority?: number
  /** 是否启用（默认 true） */
  readonly enabled?: boolean
  /** 标签 */
  readonly tags?: ReadonlyArray<string>
  /** 依赖的其他 Skill ID */
  readonly dependencies?: ReadonlyArray<string>
  /** 脚本配置目录（相对于 skill 目录） */
  readonly scriptsDir?: string

  // ============== 能力定义（可选，也可单独文件） ==============

  /** 能力列表 */
  readonly capabilities?: ReadonlyArray<CapabilityDefinition>
}

// ============== 指令类型 ==============

/**
 * SKILL.md 指令结构
 *
 * 第二层加载：按需加载，只在调用该 Skill 时才读取
 * 预估大小：~500 tokens per skill
 */
export interface SkillInstructions {
  /** 原始 Markdown 内容 */
  readonly content: string
  /** 解析后的能力描述（可选） */
  readonly parsedCapabilities?: ParsedCapability[]
}

/**
 * 从 SKILL.md 解析的能力描述
 */
export interface ParsedCapability {
  /** 能力名称 */
  readonly name: string
  /** 描述文本 */
  readonly description: string
  /** 示例列表 */
  readonly examples: string[]
}

// ============== 完整 Skill 类型 ==============

/**
 * 文件系统级 Skill
 *
 * 整合三层加载的结果
 */
export interface FileBasedSkillData {
  /** 元数据（第一层） */
  readonly metadata: SkillMetadataYaml
  /** 指令内容（第二层，延迟加载） */
  instructions?: SkillInstructions
  /** 执行脚本路径（第三层） */
  readonly scriptPath?: string
}

// ============== 类型守卫 ==============

/**
 * 检查是否为有效的 SkillMetadataYaml
 */
export function isSkillMetadataYaml(value: unknown): value is SkillMetadataYaml {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.domain === 'string'
  )
}

/**
 * 检查是否为有效的 CapabilityDefinition
 */
export function isCapabilityDefinition(value: unknown): value is CapabilityDefinition {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>

  return (
    typeof obj.name === 'string' &&
    typeof obj.description === 'string'
  )
}

// ============== 转换函数 ==============

/**
 * 将 SlotDefinition 转换为 CapabilitySlot
 */
export function toCapabilitySlot(slot: SlotDefinition): CapabilitySlot {
  return {
    name: slot.name,
    type: slot.type,
    required: slot.required ?? false,
    enumValues: slot.enumValues,
    description: slot.description,
  }
}

/**
 * 将 CapabilityDefinition 转换为 SkillCapability
 */
export function toSkillCapability(cap: CapabilityDefinition): SkillCapability {
  return {
    name: cap.name,
    description: cap.description,
    examples: cap.examples ?? [],
    slots: cap.slots?.map(toCapabilitySlot),
    keywords: cap.keywords,
  }
}

/**
 * 将 SkillMetadataYaml 转换为 Skill 接口
 */
export function toSkillInterface(
  metadata: SkillMetadataYaml,
  instructions?: SkillInstructions
): Skill {
  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    domain: metadata.domain,
    capabilities: metadata.capabilities?.map(toSkillCapability) ?? [],
    metadata: {
      version: metadata.version,
      author: metadata.author,
      priority: metadata.priority,
      enabled: metadata.enabled,
      dependencies: metadata.dependencies,
      tags: metadata.tags,
    },
    // execute 方法需要由 FileBasedSkill 类提供
    execute: async () => {
      throw new Error('FileBasedSkill execute not implemented - use FileBasedSkill class instead')
    },
  }
}
