/**
 * FileBasedSkillRegistry - 基于文件系统的 Skill 注册表
 *
 * 实现三层加载策略：
 * 1. 第一层：启动时加载 skill.yaml 元数据
 * 2. 第二层：调用时读取 SKILL.md 指令
 * 3. 第三层：需要时执行脚本
 *
 * 主要职责：
 * - 扫描 skills 目录
 * - 管理 Skill 元数据
 * - 延迟加载指令
 * - 生成能力描述
 */

import type { DomainType } from '../../types/domain.js'
import type { Skill } from '../types.js'
import { SkillLoader, FileBasedSkill } from './skill-loader.js'
import type { SkillMetadataYaml, SkillInstructions } from './types.js'

/**
 * FileBasedSkillRegistry 配置选项
 */
export interface FileBasedSkillRegistryOptions {
  /** 是否缓存指令 */
  cacheInstructions?: boolean
  /** 自定义文件编码 */
  encoding?: BufferEncoding
}

/**
 * 基于文件系统的 Skill 注册表
 *
 * 使用 SkillLoader 加载文件系统级 Skills
 */
export class FileBasedSkillRegistry {
  private readonly loader: SkillLoader
  private readonly skills: Map<string, FileBasedSkill> = new Map()
  private readonly domainIndex: Map<DomainType, FileBasedSkill[]> = new Map()

  constructor(options?: FileBasedSkillRegistryOptions) {
    // 默认使用项目根目录下的 skills 目录
    const skillsDir = process.env.SKILLS_DIR || 'skills'
    this.loader = new SkillLoader(skillsDir, {
      cacheInstructions: options?.cacheInstructions ?? true,
      encoding: options?.encoding ?? 'utf-8',
    })
  }

  /**
   * 扫描 Skills 目录，加载所有 Skill 元数据
   *
   * 第一层加载：只加载 skill.yaml，指令延迟加载
   */
  async scanSkillsDirectory(directory: string): Promise<void> {
    // 创建新的 loader 用于指定目录
    const loader = new SkillLoader(directory)
    const skills = await loader.loadAllSkills()

    // 清空现有数据
    this.skills.clear()
    this.domainIndex.clear()

    // 注册所有 Skills
    for (const skill of skills) {
      this.registerSkill(skill)
    }

    console.log(`[FileBasedSkillRegistry] Loaded ${skills.length} skills from ${directory}`)
  }

  /**
   * 注册 Skill 到内存索引
   */
  private registerSkill(skill: FileBasedSkill): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[FileBasedSkillRegistry] Overwriting existing skill: ${skill.id}`)
    }

    this.skills.set(skill.id, skill)

    // 更新领域索引
    const domain = skill.domain as DomainType
    if (!this.domainIndex.has(domain)) {
      this.domainIndex.set(domain, [])
    }
    this.domainIndex.get(domain)!.push(skill)

    console.log(`[FileBasedSkillRegistry] Registered skill: ${skill.id} (domain: ${skill.domain})`)
  }

  /**
   * 获取所有 Skill 元数据（第一层）
   *
   * 返回轻量级元数据，用于启动时展示和路由决策
   */
  getAllMetadata(): SkillMetadataYaml[] {
    return Array.from(this.skills.values()).map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      domain: skill.domain as SkillMetadataYaml['domain'],
      version: skill.metadata.version as string,
      priority: skill.metadata.priority as number,
      enabled: skill.metadata.enabled as boolean,
      tags: skill.metadata.tags as string[],
      capabilities: skill.capabilities.map(cap => ({
        name: cap.name,
        description: cap.description,
        examples: cap.examples as string[],
        slots: cap.slots,
        keywords: cap.keywords,
      })),
    }))
  }

  /**
   * 获取特定 Skill 的元数据
   */
  getMetadata(skillId: string): SkillMetadataYaml | undefined {
    const skill = this.skills.get(skillId)
    if (!skill) return undefined

    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      domain: skill.domain as SkillMetadataYaml['domain'],
      version: skill.metadata.version as string,
      priority: skill.metadata.priority as number,
      enabled: skill.metadata.enabled as boolean,
      tags: skill.metadata.tags as string[],
      capabilities: skill.capabilities.map(cap => ({
        name: cap.name,
        description: cap.description,
        examples: cap.examples as string[],
        slots: cap.slots,
        keywords: cap.keywords,
      })),
    }
  }

  /**
   * 加载 Skill 指令（第二层）
   *
   * 延迟加载，只在需要时才读取 SKILL.md
   */
  async loadInstructions(skillId: string): Promise<SkillInstructions | null> {
    const skill = this.skills.get(skillId)
    if (!skill) return null

    return skill.getInstructionsObject()
  }

  /**
   * 生成能力描述（用于 Prompt）
   *
   * 生成格式化的能力描述文本，供 LLM 进行意图识别
   *
   * @param skillIds - 可选，指定要包含的 Skill ID 列表
   */
  async getCapabilityDescriptions(skillIds?: string[]): Promise<string> {
    const targetSkills = skillIds
      ? skillIds.map(id => this.skills.get(id)).filter((s): s is FileBasedSkill => s !== undefined)
      : Array.from(this.skills.values())

    const descriptions: string[] = []

    for (const skill of targetSkills) {
      descriptions.push(this.formatSkillDescription(skill))
    }

    return descriptions.join('\n\n---\n\n')
  }

  /**
   * 格式化单个 Skill 的描述
   */
  private formatSkillDescription(skill: FileBasedSkill): string {
    const lines: string[] = []

    lines.push(`### ${skill.id} (${skill.name})`)
    lines.push(`${skill.description}`)
    lines.push('')

    for (const cap of skill.capabilities) {
      lines.push(`- ${cap.name}: ${cap.description}`)

      // 添加槽位信息
      if (cap.slots && cap.slots.length > 0) {
        for (const slot of cap.slots) {
          const required = slot.required ? ' (必需)' : ''
          lines.push(`  - ${slot.name}: ${slot.description || slot.type}${required}`)
        }
      }

      // 添加示例
      if (cap.examples && cap.examples.length > 0) {
        lines.push(`  示例: "${cap.examples[0]}"`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 获取 Skill 接口对象
   */
  getSkill(skillId: string): Skill | undefined {
    const fileSkill = this.skills.get(skillId)
    return fileSkill?.toSkillInterface()
  }

  /**
   * 获取 FileBasedSkill 对象（内部使用）
   */
  getFileBasedSkill(skillId: string): FileBasedSkill | undefined {
    return this.skills.get(skillId)
  }

  /**
   * 获取所有已注册的 Skill
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values()).map(s => s.toSkillInterface())
  }

  /**
   * 获取特定领域的 Skills
   */
  getSkillsByDomain(domain: DomainType): Skill[] {
    const fileSkills = this.domainIndex.get(domain) || []
    return fileSkills.map(s => s.toSkillInterface())
  }

  /**
   * 检查 Skill 是否存在
   */
  has(skillId: string): boolean {
    return this.skills.has(skillId)
  }

  /**
   * 获取注册的 Skill 数量
   */
  size(): number {
    return this.skills.size
  }

  /**
   * 清除所有已注册的 Skills
   */
  clear(): void {
    this.skills.clear()
    this.domainIndex.clear()
    this.loader.clearCache()
  }

  /**
   * 获取所有已注册的领域
   */
  getRegisteredDomains(): DomainType[] {
    return Array.from(this.domainIndex.keys())
  }

  /**
   * 获取 SkillLoader（用于高级操作）
   */
  getLoader(): SkillLoader {
    return this.loader
  }
}

// 全局单例
let globalRegistry: FileBasedSkillRegistry | null = null

/**
 * 获取全局 FileBasedSkillRegistry 实例
 */
export function getGlobalFileBasedSkillRegistry(): FileBasedSkillRegistry {
  if (!globalRegistry) {
    globalRegistry = new FileBasedSkillRegistry()
  }
  return globalRegistry
}

/**
 * 重置全局 FileBasedSkillRegistry（用于测试）
 */
export function resetGlobalFileBasedSkillRegistry(): void {
  globalRegistry = null
}
