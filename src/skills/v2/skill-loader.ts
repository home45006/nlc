/**
 * SkillLoader - 文件系统级 Skills 加载器
 *
 * 实现渐进式披露的三层加载策略：
 * 1. 第一层：启动时加载 skill.yaml（元数据常驻，~50 tokens）
 * 2. 第二层：调用时读取 SKILL.md（指令按需，~500 tokens）
 * 3. 第三层：需要时执行 scripts/（资源延后）
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Skill, SkillCapability, SkillInput, SkillContext, SkillResult } from '../types.js'
import {
  type SkillMetadataYaml,
  type SkillInstructions,
  type CapabilityDefinition,
  isSkillMetadataYaml,
  toSkillCapability,
} from './types.js'
import { parseSimpleYaml } from './yaml-parser.js'

/**
 * FileBasedSkill 类
 *
 * 代表一个文件系统级 Skill，支持延迟加载指令
 */
export class FileBasedSkill implements Skill {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly domain: string
  readonly capabilities: SkillCapability[]
  readonly metadata: Record<string, unknown>
  /** 原始能力定义（保留 script 等扩展字段） */
  readonly rawCapabilities: ReadonlyArray<CapabilityDefinition>

  private instructionsLoaded = false
  private instructionsCache: SkillInstructions | null = null
  private readonly skillDir: string
  private readonly loader: SkillLoader

  constructor(
    metadata: SkillMetadataYaml,
    skillDir: string,
    loader: SkillLoader
  ) {
    this.id = metadata.id
    this.name = metadata.name
    this.description = metadata.description
    this.domain = metadata.domain
    this.rawCapabilities = metadata.capabilities ?? []
    this.capabilities = metadata.capabilities?.map(toSkillCapability) ?? []
    this.metadata = {
      version: metadata.version,
      author: metadata.author,
      priority: metadata.priority,
      enabled: metadata.enabled,
      dependencies: metadata.dependencies,
      tags: metadata.tags,
      scriptsDir: metadata.scriptsDir,
    }
    this.skillDir = skillDir
    this.loader = loader
  }

  /**
   * 获取 Skill 目录路径
   */
  getSkillDir(): string {
    return this.skillDir
  }

  /**
   * 检查是否已加载指令
   */
  hasLoadedInstructions(): boolean {
    return this.instructionsLoaded
  }

  /**
   * 获取指令内容（延迟加载）
   */
  async getInstructions(): Promise<string | null> {
    if (!this.instructionsLoaded) {
      this.instructionsCache = await this.loader.loadInstructionsInternal(this.skillDir)
      this.instructionsLoaded = true
    }
    return this.instructionsCache?.content ?? null
  }

  /**
   * 获取完整指令对象（延迟加载）
   */
  async getInstructionsObject(): Promise<SkillInstructions | null> {
    if (!this.instructionsLoaded) {
      this.instructionsCache = await this.loader.loadInstructionsInternal(this.skillDir)
      this.instructionsLoaded = true
    }
    return this.instructionsCache
  }

  /**
   * 转换为 Skill 接口
   */
  toSkillInterface(): Skill {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      domain: this.domain as Skill['domain'],
      capabilities: this.capabilities,
      metadata: this.metadata,
      execute: this.execute.bind(this),
    }
  }

  /**
   * 执行 Skill
   *
   * 注意：这是基本实现，实际执行逻辑在 scripts/ 中
   * 这里主要是返回一个占位结果
   */
  async execute(input: SkillInput, _context: SkillContext): Promise<SkillResult> {
    // 加载指令（如果还没加载）
    const instructions = await this.getInstructions()

    return {
      success: true,
      intent: input.contextInfo?.relatedEntities?.capability as string ?? 'unknown',
      slots: input.contextInfo?.relatedEntities ?? {},
      commands: [],
      ttsText: instructions ? `Skill ${this.name} executed` : undefined,
      confidence: input.confidence,
    }
  }
}

/**
 * SkillLoader 配置选项
 */
export interface SkillLoaderOptions {
  /** 是否缓存指令 */
  cacheInstructions?: boolean
  /** 自定义文件编码 */
  encoding?: BufferEncoding
}

/**
 * SkillLoader 类
 *
 * 负责从文件系统扫描和加载 Skills
 */
export class SkillLoader {
  private readonly skillsDir: string
  private readonly options: Required<SkillLoaderOptions>
  private readonly metadataCache: Map<string, SkillMetadataYaml> = new Map()
  private readonly instructionsCache: Map<string, SkillInstructions> = new Map()

  constructor(skillsDir: string, options?: SkillLoaderOptions) {
    this.skillsDir = skillsDir
    this.options = {
      cacheInstructions: options?.cacheInstructions ?? true,
      encoding: options?.encoding ?? 'utf-8',
    }
  }

  /**
   * 扫描 Skills 目录，返回所有有效的 Skill ID
   */
  async scanSkills(): Promise<string[]> {
    if (!fs.existsSync(this.skillsDir)) {
      return []
    }

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true })
    const skillIds: string[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillDir = path.join(this.skillsDir, entry.name)
      const yamlPath = path.join(skillDir, 'skill.yaml')

      // 检查是否存在 skill.yaml
      if (fs.existsSync(yamlPath)) {
        skillIds.push(entry.name)
      }
    }

    return skillIds
  }

  /**
   * 第一层：加载 skill.yaml 元数据
   */
  async loadMetadata(skillId: string): Promise<SkillMetadataYaml | null> {
    // 检查缓存
    if (this.metadataCache.has(skillId)) {
      return this.metadataCache.get(skillId)!
    }

    const skillDir = path.join(this.skillsDir, skillId)
    const yamlPath = path.join(skillDir, 'skill.yaml')

    if (!fs.existsSync(yamlPath)) {
      return null
    }

    try {
      const content = fs.readFileSync(yamlPath, this.options.encoding)
      const parsed = parseSimpleYaml(content)

      // 验证必需字段
      if (!isSkillMetadataYaml(parsed)) {
        console.warn(`[SkillLoader] Invalid skill.yaml for ${skillId}: missing required fields`)
        return null
      }

      // 如果 parsed 中没有 id，使用目录名
      const metadata: SkillMetadataYaml = {
        ...parsed,
        id: parsed.id || skillId,
      }

      // 缓存
      this.metadataCache.set(skillId, metadata)

      return metadata
    } catch (error) {
      console.warn(`[SkillLoader] Failed to load skill.yaml for ${skillId}:`, error)
      return null
    }
  }

  /**
   * 第二层：加载 SKILL.md 指令
   */
  async loadInstructions(skillId: string): Promise<SkillInstructions | null> {
    const skillDir = path.join(this.skillsDir, skillId)
    const instructions = await this.loadInstructionsInternal(skillDir)
    return instructions
  }

  /**
   * 加载示例查询文件
   */
  async loadExamples(skillId: string): Promise<string[]> {
    const skillDir = path.join(this.skillsDir, skillId)
    const examplesDir = path.join(skillDir, 'examples')

    if (!fs.existsSync(examplesDir)) {
      return []
    }

    const examples: string[] = []

    // 读取 examples 目录下的所有 .md 文件
    const entries = fs.readdirSync(examplesDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue

      const filePath = path.join(examplesDir, entry.name)
      try {
        const content = fs.readFileSync(filePath, this.options.encoding)
        // 解析 Markdown，提取非空的行（排除标题和空行）
        const lines = content.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          // 排除标题（# 开头）、空行、注释
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('<!--')) {
            // 去掉列表标记
            const example = trimmed.replace(/^[-*]\s*/, '').trim()
            if (example) {
              examples.push(example)
            }
          }
        }
      } catch (error) {
        console.warn(`[SkillLoader] Failed to load examples from ${filePath}:`, error)
      }
    }

    return examples
  }

  /**
   * 内部方法：从指定目录加载指令
   */
  async loadInstructionsInternal(skillDir: string): Promise<SkillInstructions | null> {
    const skillId = path.basename(skillDir)

    // 检查缓存
    if (this.options.cacheInstructions && this.instructionsCache.has(skillId)) {
      return this.instructionsCache.get(skillId)!
    }

    const mdPath = path.join(skillDir, 'SKILL.md')

    if (!fs.existsSync(mdPath)) {
      return null
    }

    try {
      const content = fs.readFileSync(mdPath, this.options.encoding)

      const instructions: SkillInstructions = {
        content,
        // 可以在这里解析 Markdown 提取能力描述
      }

      // 缓存
      if (this.options.cacheInstructions) {
        this.instructionsCache.set(skillId, instructions)
      }

      return instructions
    } catch (error) {
      console.warn(`[SkillLoader] Failed to load SKILL.md for ${skillId}:`, error)
      return null
    }
  }

  /**
   * 完整加载：返回 FileBasedSkill 对象
   */
  async loadSkill(skillId: string): Promise<FileBasedSkill | null> {
    const metadata = await this.loadMetadata(skillId)

    if (!metadata) {
      return null
    }

    const skillDir = path.join(this.skillsDir, skillId)

    return new FileBasedSkill(metadata, skillDir, this)
  }

  /**
   * 加载所有 Skills（只加载元数据，指令延迟加载）
   */
  async loadAllSkills(): Promise<FileBasedSkill[]> {
    const skillIds = await this.scanSkills()
    const skills: FileBasedSkill[] = []

    for (const skillId of skillIds) {
      const skill = await this.loadSkill(skillId)
      if (skill && skill.metadata.enabled !== false) {
        skills.push(skill)
      }
    }

    // 按 priority 排序（数字越小优先级越高）
    skills.sort((a, b) => {
      const priorityA = (a.metadata.priority as number) ?? 100
      const priorityB = (b.metadata.priority as number) ?? 100
      return priorityA - priorityB
    })

    return skills
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.metadataCache.clear()
    this.instructionsCache.clear()
  }
}
