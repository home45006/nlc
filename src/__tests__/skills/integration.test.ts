/**
 * Skill 系统集成测试 (V2 架构)
 *
 * 验证 FileBasedSkillOrchestrator 与文件系统 Skills 的集成
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  FileBasedSkillRegistry,
  SkillExecutor,
  FileBasedSkillOrchestrator,
  createFileBasedSkillOrchestrator,
} from '../../skills/index.js'
import type { LLMProvider } from '../../types/llm.js'
import { createDefaultVehicleState } from '../../types/vehicle.js'

// Mock LLM Provider
const mockProvider: LLMProvider = {
  name: 'mock',
  chat: async () => ({
    content: JSON.stringify({
      reasoning: 'Test intent recognition',
      intents: [
        {
          skillId: 'vehicle_control',
          capability: 'ac_control',
          slots: { action: 'turn_on' },
          confidence: 0.95,
        },
      ],
    }),
    usage: { inputTokens: 0, outputTokens: 0 },
  }),
  chatWithTools: async () => ({
    content: '{}',
    toolCalls: [],
    usage: { inputTokens: 0, outputTokens: 0 },
  }),
}

describe('Skill System Integration (V2)', () => {
  let registry: FileBasedSkillRegistry
  let executor: SkillExecutor
  let orchestrator: FileBasedSkillOrchestrator

  const mockContext = {
    vehicleState: createDefaultVehicleState(),
    dialogHistory: [] as Array<{ role: string; content: string }>,
  }

  beforeEach(async () => {
    registry = new FileBasedSkillRegistry()
    executor = new SkillExecutor()

    // 扫描 Skills 目录
    await registry.scanSkillsDirectory('skills')

    // 创建 Orchestrator
    orchestrator = createFileBasedSkillOrchestrator(mockProvider, {
      skillsDirectory: 'skills',
      enableLogging: false,
    })
    await orchestrator.initialize()
  })

  afterEach(() => {
    registry.clear()
  })

  describe('Registry 集成', () => {
    it('应该从文件系统加载 Skills', () => {
      const skills = registry.getAllSkills()
      expect(skills.length).toBeGreaterThan(0)
    })

    it('应该加载 vehicle_control skill', () => {
      const skill = registry.getSkill('vehicle_control')
      expect(skill).toBeDefined()
      expect(skill?.name).toBe('车辆控制')
    })

    it('应该加载 music skill', () => {
      const skill = registry.getSkill('music')
      expect(skill).toBeDefined()
      expect(skill?.name).toBe('音乐控制')
    })

    it('应该加载 navigation skill', () => {
      const skill = registry.getSkill('navigation')
      expect(skill).toBeDefined()
      expect(skill?.name).toBe('导航控制')
    })

    it('应该加载 chat skill', () => {
      const skill = registry.getSkill('chat')
      expect(skill).toBeDefined()
      expect(skill?.name).toBe('智能问答')
    })
  })

  describe('能力描述', () => {
    it('应该生成能力描述', async () => {
      const descriptions = await registry.getCapabilityDescriptions()
      expect(descriptions).toContain('vehicle_control')
      expect(descriptions).toContain('music')
      expect(descriptions).toContain('navigation')
      expect(descriptions).toContain('chat')
    })

    it('应该包含能力示例', async () => {
      const descriptions = await registry.getCapabilityDescriptions()
      // 检查能力名称格式
      expect(descriptions).toContain('ac_control:')
      expect(descriptions).toContain('play_pause:')
    })
  })

  describe('Orchestrator 集成', () => {
    it('应该初始化并加载 Skills', async () => {
      const skills = orchestrator.getSkills()
      expect(skills.length).toBeGreaterThan(0)
    })

    it('应该处理用户输入并返回结果', async () => {
      const result = await orchestrator.process('打开空调', mockContext)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.response).toBeDefined()
    })

    it('应该识别意图', async () => {
      const result = await orchestrator.process('打开空调', mockContext)

      expect(result.intents).toBeDefined()
      expect(result.intents?.length).toBeGreaterThan(0)
      expect(result.intents?.[0]?.skillId).toBe('vehicle_control')
    })
  })

  describe('Executor 集成', () => {
    it('应该执行能力并返回结果', async () => {
      // SkillExecutor 需要注册处理器才能执行
      // 这里测试基本的 API 结构
      const result = await executor.executeCapability(
        'vehicle_control',
        'ac_control',
        { action: 'turn_on' },
        mockContext
      )

      expect(result).toBeDefined()
      // 没有注册处理器时会返回错误
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该为未知能力返回错误', async () => {
      const result = await executor.executeCapability(
        'unknown_skill',
        'unknown_capability',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('多意图处理', () => {
    it('应该支持并行执行多个意图的 API', async () => {
      // 测试 API 存在性
      expect(typeof executor.executeMultipleCapabilities).toBe('function')
    })
  })

  describe('Registry 功能', () => {
    it('应该支持获取所有 Skills', () => {
      const skills = registry.getAllSkills()
      expect(skills.length).toBeGreaterThan(0)
    })

    it('应该支持按领域获取 Skills', () => {
      const skills = registry.getSkillsByDomain('vehicle_control')
      expect(skills.length).toBeGreaterThan(0)
      expect(skills[0]?.id).toBe('vehicle_control')
    })

    it('应该支持检查 Skill 是否存在', () => {
      expect(registry.has('vehicle_control')).toBe(true)
      expect(registry.has('unknown_skill')).toBe(false)
    })

    it('应该支持获取注册的领域', () => {
      const domains = registry.getRegisteredDomains()
      expect(domains).toContain('vehicle_control')
      expect(domains).toContain('music')
      expect(domains).toContain('navigation')
      expect(domains).toContain('chat')
    })

    it('应该支持获取 Skill 数量', () => {
      expect(registry.size()).toBe(4)
    })
  })
})
