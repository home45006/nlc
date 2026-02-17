/**
 * FileBasedSkillRegistry 测试
 *
 * Phase 3 (TDD): 测试基于文件系统的 Skill 注册表
 *
 * 测试覆盖：
 * - 扫描 skills 目录
 * - 获取所有元数据（第一层）
 * - 延迟加载指令（第二层）
 * - 生成能力描述（用于 Prompt）
 * - 按需加载能力
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { FileBasedSkillRegistry } from '../../../skills/v2/file-based-skill-registry.js'
import type { SkillMetadataYaml } from '../../../skills/v2/types.js'

// 测试目录
const TEST_SKILLS_DIR = path.join(process.cwd(), 'test-skills-registry-temp')

// 辅助函数：创建测试 Skill 目录结构
function createTestSkill(skillId: string, metadata: Partial<SkillMetadataYaml>, instructions?: string) {
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
      if (cap.examples) {
        yamlContent += `\n    examples:`
        for (const ex of cap.examples) {
          yamlContent += `\n      - ${ex}`
        }
      }
    }
  }

  fs.writeFileSync(path.join(skillDir, 'skill.yaml'), yamlContent)

  // 创建 SKILL.md（如果提供）
  if (instructions) {
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), instructions)
  }
}

// 辅助函数：清理测试目录
function cleanupTestDir() {
  if (fs.existsSync(TEST_SKILLS_DIR)) {
    fs.rmSync(TEST_SKILLS_DIR, { recursive: true, force: true })
  }
}

describe('FileBasedSkillRegistry', () => {
  let registry: FileBasedSkillRegistry

  beforeEach(() => {
    cleanupTestDir()
    fs.mkdirSync(TEST_SKILLS_DIR, { recursive: true })
    registry = new FileBasedSkillRegistry()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('scanSkillsDirectory', () => {
    it('应该扫描目录并加载所有 Skill 元数据', async () => {
      createTestSkill('vehicle_control', {
        name: '车辆控制',
        domain: 'vehicle_control',
        priority: 1,
      }, '# 车辆控制指令')

      createTestSkill('music', {
        name: '音乐控制',
        domain: 'music',
        priority: 2,
      }, '# 音乐控制指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)

      expect(registry.size()).toBe(2)
    })

    it('应该忽略 enabled 为 false 的 Skills', async () => {
      createTestSkill('enabled_skill', { name: '启用', enabled: true }, '# 指令')
      createTestSkill('disabled_skill', { name: '禁用', enabled: false }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)

      expect(registry.size()).toBe(1)
      expect(registry.has('enabled_skill')).toBe(true)
      expect(registry.has('disabled_skill')).toBe(false)
    })

    it('应该按 priority 排序 Skills', async () => {
      createTestSkill('low', { name: '低优先级', priority: 100 }, '# 指令')
      createTestSkill('high', { name: '高优先级', priority: 1 }, '# 指令')
      createTestSkill('medium', { name: '中优先级', priority: 50 }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)

      const skills = registry.getAllMetadata()
      expect(skills[0].id).toBe('high')
      expect(skills[1].id).toBe('medium')
      expect(skills[2].id).toBe('low')
    })

    it('应该处理空目录', async () => {
      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)

      expect(registry.size()).toBe(0)
      expect(registry.getAllMetadata()).toEqual([])
    })

    it('应该处理不存在的目录', async () => {
      await registry.scanSkillsDirectory('/non/existent/path')

      expect(registry.size()).toBe(0)
    })
  })

  describe('getAllMetadata (第一层)', () => {
    it('应该返回所有 Skill 的元数据', async () => {
      createTestSkill('vehicle_control', {
        name: '车辆控制',
        domain: 'vehicle_control',
        capabilities: [
          { name: 'ac_control', description: '空调控制' },
        ],
      }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      const metadata = registry.getAllMetadata()

      expect(metadata).toHaveLength(1)
      expect(metadata[0].id).toBe('vehicle_control')
      expect(metadata[0].name).toBe('车辆控制')
      expect(metadata[0].capabilities).toHaveLength(1)
    })

    it('应该返回空数组当没有 Skills', async () => {
      const metadata = registry.getAllMetadata()
      expect(metadata).toEqual([])
    })
  })

  describe('getMetadata', () => {
    it('应该返回特定 Skill 的元数据', async () => {
      createTestSkill('music', {
        name: '音乐控制',
        domain: 'music',
      }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      const metadata = registry.getMetadata('music')

      expect(metadata).toBeDefined()
      expect(metadata?.id).toBe('music')
      expect(metadata?.name).toBe('音乐控制')
    })

    it('应该返回 undefined 当 Skill 不存在', async () => {
      const metadata = registry.getMetadata('non_existent')
      expect(metadata).toBeUndefined()
    })
  })

  describe('loadInstructions (第二层)', () => {
    it('应该延迟加载指令内容', async () => {
      createTestSkill('vehicle_control', {
        name: '车辆控制',
      }, '# 车辆控制指令\n\n## 能力\n- 空调控制')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)

      // 指令应该还未加载
      const skill = registry.getFileBasedSkill('vehicle_control')
      expect(skill?.hasLoadedInstructions()).toBe(false)

      // 加载指令
      const instructions = await registry.loadInstructions('vehicle_control')

      expect(instructions).toBeDefined()
      expect(instructions?.content).toContain('# 车辆控制指令')
      expect(skill?.hasLoadedInstructions()).toBe(true)
    })

    it('应该返回 null 当 SKILL.md 不存在', async () => {
      createTestSkill('no_instructions', { name: '无指令' }) // 不创建 SKILL.md

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      const instructions = await registry.loadInstructions('no_instructions')

      expect(instructions).toBeNull()
    })

    it('应该缓存已加载的指令', async () => {
      createTestSkill('cached', { name: '缓存测试' }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)

      const inst1 = await registry.loadInstructions('cached')
      const inst2 = await registry.loadInstructions('cached')

      expect(inst1).toBe(inst2)
    })
  })

  describe('getCapabilityDescriptions', () => {
    it('应该生成所有 Skill 的能力描述文本', async () => {
      createTestSkill('vehicle_control', {
        name: '车辆控制',
        description: '控制车辆功能',
        capabilities: [
          { name: 'ac_control', description: '空调控制', examples: ['打开空调'] },
          { name: 'window_control', description: '车窗控制', examples: ['打开车窗'] },
        ],
      }, '# 指令')

      createTestSkill('music', {
        name: '音乐控制',
        description: '音乐播放',
        capabilities: [
          { name: 'play_music', description: '播放音乐', examples: ['播放周杰伦'] },
        ],
      }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      const descriptions = await registry.getCapabilityDescriptions()

      expect(descriptions).toContain('vehicle_control')
      expect(descriptions).toContain('车辆控制')
      expect(descriptions).toContain('ac_control')
      expect(descriptions).toContain('空调控制')
      expect(descriptions).toContain('music')
      expect(descriptions).toContain('音乐控制')
      expect(descriptions).toContain('play_music')
    })

    it('应该支持只获取特定 Skill 的能力描述', async () => {
      createTestSkill('vehicle_control', {
        name: '车辆控制',
        capabilities: [{ name: 'ac_control', description: '空调控制' }],
      }, '# 指令')

      createTestSkill('music', {
        name: '音乐控制',
        capabilities: [{ name: 'play_music', description: '播放音乐' }],
      }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      const descriptions = await registry.getCapabilityDescriptions(['music'])

      expect(descriptions).toContain('music')
      expect(descriptions).toContain('play_music')
      expect(descriptions).not.toContain('vehicle_control')
      expect(descriptions).not.toContain('ac_control')
    })
  })

  describe('getSkill', () => {
    it('应该返回 Skill 接口对象', async () => {
      createTestSkill('navigation', {
        name: '导航控制',
        domain: 'navigation',
        capabilities: [
          { name: 'set_destination', description: '设置目的地' },
        ],
      }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      const skill = registry.getSkill('navigation')

      expect(skill).toBeDefined()
      expect(skill?.id).toBe('navigation')
      expect(skill?.name).toBe('导航控制')
      expect(skill?.domain).toBe('navigation')
      expect(skill?.capabilities).toHaveLength(1)
      expect(skill?.capabilities[0].name).toBe('set_destination')
    })
  })

  describe('has', () => {
    it('应该返回 true 当 Skill 存在', async () => {
      createTestSkill('chat', { name: '聊天' }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)

      expect(registry.has('chat')).toBe(true)
    })

    it('应该返回 false 当 Skill 不存在', () => {
      expect(registry.has('non_existent')).toBe(false)
    })
  })

  describe('size', () => {
    it('应该返回注册的 Skill 数量', async () => {
      expect(registry.size()).toBe(0)

      createTestSkill('skill1', { name: 'Skill 1' }, '# 指令')
      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      expect(registry.size()).toBe(1)

      createTestSkill('skill2', { name: 'Skill 2' }, '# 指令')
      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      expect(registry.size()).toBe(2)
    })
  })

  describe('clear', () => {
    it('应该清除所有已注册的 Skills', async () => {
      createTestSkill('skill1', { name: 'Skill 1' }, '# 指令')
      createTestSkill('skill2', { name: 'Skill 2' }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)
      expect(registry.size()).toBe(2)

      registry.clear()

      expect(registry.size()).toBe(0)
      expect(registry.getAllMetadata()).toEqual([])
    })
  })

  describe('getSkillsByDomain', () => {
    it('应该返回特定领域的 Skills', async () => {
      createTestSkill('vehicle_control', { name: '车控', domain: 'vehicle_control' }, '# 指令')
      createTestSkill('music', { name: '音乐', domain: 'music' }, '# 指令')
      createTestSkill('navigation', { name: '导航', domain: 'navigation' }, '# 指令')

      await registry.scanSkillsDirectory(TEST_SKILLS_DIR)

      const vehicleSkills = registry.getSkillsByDomain('vehicle_control')
      expect(vehicleSkills).toHaveLength(1)
      expect(vehicleSkills[0].id).toBe('vehicle_control')
    })

    it('应该返回空数组当领域没有 Skills', async () => {
      const skills = registry.getSkillsByDomain('vehicle_control')
      expect(skills).toEqual([])
    })
  })
})
