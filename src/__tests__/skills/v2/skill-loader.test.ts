/**
 * SkillLoader 测试
 *
 * Phase 1 (TDD): 测试文件系统级 Skills 的加载功能
 *
 * 测试覆盖：
 * - 扫描 skills 目录
 * - 加载 skill.yaml 元数据
 * - 加载 SKILL.md 指令
 * - 渐进式披露（三层加载）
 * - 错误处理
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SkillLoader, FileBasedSkill } from '../../../skills/v2/skill-loader.js'
import type { SkillMetadataYaml, SkillInstructions } from '../../../skills/v2/types.js'

// 测试目录
const TEST_SKILLS_DIR = path.join(process.cwd(), 'test-skills-temp')

// 辅助函数：创建测试 Skill 目录结构
function createTestSkill(skillId: string, metadata: Partial<SkillMetadataYaml>, instructions: string) {
  const skillDir = path.join(TEST_SKILLS_DIR, skillId)
  fs.mkdirSync(skillDir, { recursive: true })

  // 构建 YAML 内容
  let yamlContent = `id: ${skillId}
name: ${metadata.name || skillId}
description: ${metadata.description || 'Test skill'}
version: ${metadata.version || '1.0.0'}
domain: ${metadata.domain || 'vehicle_control'}
priority: ${metadata.priority || 100}
enabled: ${metadata.enabled !== false}`

  // 添加 tags（如果存在）
  if (metadata.tags && metadata.tags.length > 0) {
    yamlContent += '\ntags:'
    for (const tag of metadata.tags) {
      yamlContent += `\n  - ${tag}`
    }
  }

  // 添加 capabilities（如果存在）
  if (metadata.capabilities && metadata.capabilities.length > 0) {
    yamlContent += '\ncapabilities:'
    for (const cap of metadata.capabilities) {
      yamlContent += `\n  - name: ${cap.name}`
      yamlContent += `\n    description: ${cap.description}`
    }
  }

  fs.writeFileSync(path.join(skillDir, 'skill.yaml'), yamlContent)

  // 创建 SKILL.md
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), instructions)
}

// 辅助函数：清理测试目录
function cleanupTestDir() {
  if (fs.existsSync(TEST_SKILLS_DIR)) {
    fs.rmSync(TEST_SKILLS_DIR, { recursive: true, force: true })
  }
}

describe('SkillLoader', () => {
  let loader: SkillLoader

  beforeEach(() => {
    cleanupTestDir()
    fs.mkdirSync(TEST_SKILLS_DIR, { recursive: true })
    loader = new SkillLoader(TEST_SKILLS_DIR)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('scanSkills', () => {
    it('应该扫描目录并返回所有 Skill ID', async () => {
      // 创建测试 Skills
      createTestSkill('vehicle_control', { name: '车辆控制' }, '# 车辆控制指令')
      createTestSkill('music', { name: '音乐控制' }, '# 音乐控制指令')

      const skillIds = await loader.scanSkills()

      expect(skillIds).toHaveLength(2)
      expect(skillIds).toContain('vehicle_control')
      expect(skillIds).toContain('music')
    })

    it('应该返回空数组当目录不存在', async () => {
      const emptyLoader = new SkillLoader('/non/existent/path')
      const skillIds = await emptyLoader.scanSkills()

      expect(skillIds).toEqual([])
    })

    it('应该忽略非目录文件', async () => {
      // 创建一个文件和目录
      fs.writeFileSync(path.join(TEST_SKILLS_DIR, 'README.md'), 'test')
      createTestSkill('vehicle_control', {}, '# 指令')

      const skillIds = await loader.scanSkills()

      expect(skillIds).toHaveLength(1)
      expect(skillIds).toContain('vehicle_control')
    })

    it('应该忽略没有 skill.yaml 的目录', async () => {
      // 创建有 skill.yaml 的目录
      createTestSkill('valid_skill', {}, '# 指令')

      // 创建没有 skill.yaml 的目录
      fs.mkdirSync(path.join(TEST_SKILLS_DIR, 'invalid_skill'), { recursive: true })

      const skillIds = await loader.scanSkills()

      expect(skillIds).toHaveLength(1)
      expect(skillIds).toContain('valid_skill')
    })
  })

  describe('loadMetadata (第一层)', () => {
    it('应该加载 skill.yaml 元数据', async () => {
      createTestSkill('vehicle_control', {
        name: '车辆控制',
        description: '控制车辆功能',
        version: '1.0.0',
        domain: 'vehicle_control',
        priority: 50,
      }, '# 指令')

      const metadata = await loader.loadMetadata('vehicle_control')

      expect(metadata).toBeDefined()
      expect(metadata?.id).toBe('vehicle_control')
      expect(metadata?.name).toBe('车辆控制')
      expect(metadata?.description).toBe('控制车辆功能')
      expect(metadata?.version).toBe('1.0.0')
      expect(metadata?.domain).toBe('vehicle_control')
      expect(metadata?.priority).toBe(50)
    })

    it('应该返回 null 当 skill.yaml 不存在', async () => {
      const metadata = await loader.loadMetadata('non_existent')

      expect(metadata).toBeNull()
    })

    it('应该正确解析 YAML 格式', async () => {
      const skillDir = path.join(TEST_SKILLS_DIR, 'test_skill')
      fs.mkdirSync(skillDir, { recursive: true })

      // 创建更复杂的 YAML
      const yamlContent = `
id: test_skill
name: 测试技能
description: |
  这是一个多行描述
  第二行描述
version: 2.0.0
domain: music
priority: 10
enabled: true
tags:
  - audio
  - media
capabilities:
  - name: play
    description: 播放音乐
  - name: pause
    description: 暂停音乐
`
      fs.writeFileSync(path.join(skillDir, 'skill.yaml'), yamlContent)

      const metadata = await loader.loadMetadata('test_skill')

      expect(metadata).toBeDefined()
      expect(metadata?.name).toBe('测试技能')
      expect(metadata?.tags).toContain('audio')
      expect(metadata?.tags).toContain('media')
      expect(metadata?.capabilities).toHaveLength(2)
    })

    it('应该处理 enabled 为 false 的情况', async () => {
      createTestSkill('disabled_skill', {
        name: '禁用技能',
        enabled: false,
      }, '# 指令')

      const metadata = await loader.loadMetadata('disabled_skill')

      expect(metadata?.enabled).toBe(false)
    })
  })

  describe('loadInstructions (第二层)', () => {
    it('应该加载 SKILL.md 指令内容', async () => {
      const instructions = `# 车辆控制技能

## 能力描述
控制空调、车窗等功能。

## 示例
- 打开空调
- 关闭车窗
`
      createTestSkill('vehicle_control', {}, instructions)

      const result = await loader.loadInstructions('vehicle_control')

      expect(result).toBeDefined()
      expect(result?.content).toContain('# 车辆控制技能')
      expect(result?.content).toContain('控制空调')
      expect(result?.content).toContain('打开空调')
    })

    it('应该返回 null 当 SKILL.md 不存在', async () => {
      // 只创建 skill.yaml
      const skillDir = path.join(TEST_SKILLS_DIR, 'no_instructions')
      fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(path.join(skillDir, 'skill.yaml'), 'id: no_instructions\nname: No Instructions')

      const result = await loader.loadInstructions('no_instructions')

      expect(result).toBeNull()
    })

    it('应该缓存已加载的指令', async () => {
      createTestSkill('cached_skill', {}, '# 指令')

      // 第一次加载
      const result1 = await loader.loadInstructions('cached_skill')
      // 第二次加载
      const result2 = await loader.loadInstructions('cached_skill')

      expect(result1).toBe(result2)
    })
  })

  describe('loadSkill (完整加载)', () => {
    it('应该返回 FileBasedSkill 对象', async () => {
      createTestSkill('vehicle_control', {
        name: '车辆控制',
        domain: 'vehicle_control',
      }, '# 车辆控制指令')

      const skill = await loader.loadSkill('vehicle_control')

      expect(skill).toBeDefined()
      expect(skill?.id).toBe('vehicle_control')
      expect(skill?.name).toBe('车辆控制')
      expect(skill?.domain).toBe('vehicle_control')
    })

    it('应该延迟加载指令（只在访问时加载）', async () => {
      createTestSkill('lazy_skill', {
        name: '延迟加载',
      }, '# 延迟加载的指令内容')

      const skill = await loader.loadSkill('lazy_skill')

      expect(skill).toBeDefined()
      // 指令应该还未加载
      expect(skill?.hasLoadedInstructions()).toBe(false)

      // 访问指令
      const instructions = await skill?.getInstructions()

      expect(instructions).toContain('延迟加载的指令内容')
      expect(skill?.hasLoadedInstructions()).toBe(true)
    })

    it('应该返回 null 当 Skill 不存在', async () => {
      const skill = await loader.loadSkill('non_existent')

      expect(skill).toBeNull()
    })
  })

  describe('loadAllSkills', () => {
    it('应该加载所有 Skill 的元数据', async () => {
      createTestSkill('vehicle_control', { name: '车辆控制' }, '# 指令1')
      createTestSkill('music', { name: '音乐' }, '# 指令2')

      const skills = await loader.loadAllSkills()

      expect(skills).toHaveLength(2)
      expect(skills.map(s => s.id)).toContain('vehicle_control')
      expect(skills.map(s => s.id)).toContain('music')
    })

    it('应该只包含 enabled 为 true 的 Skills', async () => {
      createTestSkill('enabled_skill', { name: '启用', enabled: true }, '# 指令')
      createTestSkill('disabled_skill', { name: '禁用', enabled: false }, '# 指令')

      const skills = await loader.loadAllSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].id).toBe('enabled_skill')
    })

    it('应该按 priority 排序', async () => {
      createTestSkill('low_priority', { name: '低优先级', priority: 100 }, '# 指令')
      createTestSkill('high_priority', { name: '高优先级', priority: 10 }, '# 指令')
      createTestSkill('medium_priority', { name: '中优先级', priority: 50 }, '# 指令')

      const skills = await loader.loadAllSkills()

      expect(skills[0].id).toBe('high_priority')
      expect(skills[1].id).toBe('medium_priority')
      expect(skills[2].id).toBe('low_priority')
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的 YAML 格式', async () => {
      const skillDir = path.join(TEST_SKILLS_DIR, 'invalid_yaml')
      fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(path.join(skillDir, 'skill.yaml'), 'invalid: yaml: content: [')

      const metadata = await loader.loadMetadata('invalid_yaml')

      expect(metadata).toBeNull()
    })

    it('应该处理缺少必需字段的 YAML', async () => {
      const skillDir = path.join(TEST_SKILLS_DIR, 'missing_fields')
      fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(path.join(skillDir, 'skill.yaml'), 'name: 缺少 ID')

      const metadata = await loader.loadMetadata('missing_fields')

      // 应该返回 null 或使用目录名作为 ID
      expect(metadata).toBeNull()
    })
  })
})

describe('FileBasedSkill', () => {
  let loader: SkillLoader

  beforeEach(() => {
    cleanupTestDir()
    fs.mkdirSync(TEST_SKILLS_DIR, { recursive: true })
    loader = new SkillLoader(TEST_SKILLS_DIR)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('getInstructions', () => {
    it('应该返回 SKILL.md 内容', async () => {
      createTestSkill('test', {}, '# 测试指令\n\n## 能力\n- 能力1')

      const skill = await loader.loadSkill('test')
      const instructions = await skill?.getInstructions()

      expect(instructions).toContain('# 测试指令')
      expect(instructions).toContain('能力1')
    })

    it('应该缓存指令内容', async () => {
      createTestSkill('test', {}, '# 原始指令')

      const skill = await loader.loadSkill('test')

      // 多次访问应该返回相同内容
      const inst1 = await skill?.getInstructions()
      const inst2 = await skill?.getInstructions()

      expect(inst1).toBe(inst2)
    })
  })

  describe('toSkillInterface', () => {
    it('应该转换为 Skill 接口格式', async () => {
      createTestSkill('vehicle_control', {
        name: '车辆控制',
        domain: 'vehicle_control',
        capabilities: [
          { name: 'ac_control', description: '空调控制' },
        ],
      }, '# 指令')

      const fileSkill = await loader.loadSkill('vehicle_control')
      const skill = fileSkill?.toSkillInterface()

      expect(skill).toBeDefined()
      expect(skill?.id).toBe('vehicle_control')
      expect(skill?.name).toBe('车辆控制')
      expect(skill?.domain).toBe('vehicle_control')
      expect(skill?.capabilities).toHaveLength(1)
      expect(skill?.capabilities[0].name).toBe('ac_control')
    })
  })
})
