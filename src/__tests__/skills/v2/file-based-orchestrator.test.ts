/**
 * FileBasedSkillOrchestrator 测试
 *
 * Phase 3 (TDD): 测试基于文件系统的 Skill Orchestrator
 *
 * 测试覆盖：
 * - 使用 FileBasedSkillRegistry 加载 Skills
 * - 使用 SkillExecutor 执行能力
 * - 三层加载策略
 * - 意图识别和执行流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { FileBasedSkillOrchestrator } from '../../../skills/v2/file-based-orchestrator.js'
import type { LLMProvider, ChatMessage } from '../../../types/llm.js'
import type { VehicleState } from '../../../types/vehicle.js'

// 测试目录
const TEST_SKILLS_DIR = path.join(process.cwd(), 'test-skills-orch-temp')

// Mock LLM Provider
const mockLLMProvider: LLMProvider = {
  chat: vi.fn(),
}

// Mock 车辆状态
const mockVehicleState: VehicleState = {
  ac: { power: false, temperature: 24, mode: 'auto', fanSpeed: 3 },
  windows: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
  seats: {
    driver: { heating: false, ventilation: false, heatingLevel: 0, ventilationLevel: 0 },
    passenger: { heating: false, ventilation: false, heatingLevel: 0, ventilationLevel: 0 },
  },
  lights: {
    ambient: { power: false, color: '白色', brightness: 50 },
    reading: { power: false },
  },
  trunk: { open: false },
  wiper: { power: false, speed: 'auto' },
}

// 辅助函数：创建测试 Skill
function createTestSkill(skillId: string, yamlContent: string, mdContent: string) {
  const skillDir = path.join(TEST_SKILLS_DIR, skillId)
  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(path.join(skillDir, 'skill.yaml'), yamlContent)
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), mdContent)
}

// 辅助函数：清理测试目录
function cleanupTestDir() {
  if (fs.existsSync(TEST_SKILLS_DIR)) {
    fs.rmSync(TEST_SKILLS_DIR, { recursive: true, force: true })
  }
}

describe('FileBasedSkillOrchestrator', () => {
  let orchestrator: FileBasedSkillOrchestrator

  beforeEach(() => {
    cleanupTestDir()
    fs.mkdirSync(TEST_SKILLS_DIR, { recursive: true })
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('初始化', () => {
    it('应该从文件系统加载 Skills', async () => {
      createTestSkill(
        'vehicle_control',
        `id: vehicle_control
name: 车辆控制
description: 控制车辆功能
domain: vehicle_control
priority: 1
enabled: true
capabilities:
  - name: ac_control
    description: 空调控制
    examples:
      - 打开空调
`,
        '# 车辆控制指令\n\n## 能力\n- 空调控制\n- 车窗控制'
      )

      orchestrator = new FileBasedSkillOrchestrator(mockLLMProvider, {
        skillsDirectory: TEST_SKILLS_DIR,
      })

      await orchestrator.initialize()

      expect(orchestrator.getSkills()).toHaveLength(1)
      expect(orchestrator.getSkills()[0].id).toBe('vehicle_control')
    })

    it('应该按优先级排序 Skills', async () => {
      createTestSkill(
        'music',
        `id: music
name: 音乐
description: 音乐控制
domain: music
priority: 100
enabled: true
`,
        '# 音乐指令'
      )

      createTestSkill(
        'vehicle_control',
        `id: vehicle_control
name: 车控
description: 车控
domain: vehicle_control
priority: 1
enabled: true
`,
        '# 车控指令'
      )

      orchestrator = new FileBasedSkillOrchestrator(mockLLMProvider, {
        skillsDirectory: TEST_SKILLS_DIR,
      })

      await orchestrator.initialize()

      const skills = orchestrator.getSkills()
      expect(skills[0].id).toBe('vehicle_control')
      expect(skills[1].id).toBe('music')
    })

    it('应该忽略禁用的 Skills', async () => {
      createTestSkill(
        'enabled',
        `id: enabled
name: 启用
description: 启用的
domain: chat
priority: 1
enabled: true
`,
        '# 启用'
      )

      createTestSkill(
        'disabled',
        `id: disabled
name: 禁用
description: 禁用的
domain: chat
priority: 2
enabled: false
`,
        '# 禁用'
      )

      orchestrator = new FileBasedSkillOrchestrator(mockLLMProvider, {
        skillsDirectory: TEST_SKILLS_DIR,
      })

      await orchestrator.initialize()

      expect(orchestrator.getSkills()).toHaveLength(1)
      expect(orchestrator.getSkills()[0].id).toBe('enabled')
    })
  })

  describe('process', () => {
    it('应该识别意图并执行能力', async () => {
      createTestSkill(
        'vehicle_control',
        `id: vehicle_control
name: 车辆控制
description: 控制车辆功能
domain: vehicle_control
priority: 1
enabled: true
capabilities:
  - name: ac_control
    description: 空调控制
    examples:
      - 打开空调
`,
        '# 车辆控制指令'
      )

      orchestrator = new FileBasedSkillOrchestrator(mockLLMProvider, {
        skillsDirectory: TEST_SKILLS_DIR,
      })

      await orchestrator.initialize()

      // Mock LLM 返回意图识别结果
      vi.mocked(mockLLMProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify({
          reasoning: '用户想打开空调',
          intents: [
            {
              skillId: 'vehicle_control',
              capability: 'ac_control',
              slots: { action: 'turn_on' },
              confidence: 0.95,
            },
          ],
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      })

      const result = await orchestrator.process('打开空调', {
        vehicleState: mockVehicleState,
        dialogHistory: [],
      })

      expect(result.success).toBe(true)
      expect(result.intents).toHaveLength(1)
      expect(result.intents?.[0].skillId).toBe('vehicle_control')
      expect(result.intents?.[0].capability).toBe('ac_control')
    })

    it('应该处理无意图的情况（走闲聊）', async () => {
      createTestSkill(
        'chat',
        `id: chat
name: 闲聊
description: 智能问答
domain: chat
priority: 100
enabled: true
capabilities:
  - name: general_chat
    description: 闲聊
`,
        '# 闲聊指令'
      )

      orchestrator = new FileBasedSkillOrchestrator(mockLLMProvider, {
        skillsDirectory: TEST_SKILLS_DIR,
      })

      await orchestrator.initialize()

      // Mock LLM 返回空意图
      vi.mocked(mockLLMProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify({
          reasoning: '这是闲聊',
          intents: [],
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      })

      const result = await orchestrator.process('今天天气怎么样', {
        vehicleState: mockVehicleState,
        dialogHistory: [],
      })

      expect(result.success).toBe(true)
    })
  })

  describe('getCapabilityDescriptions', () => {
    it('应该生成能力描述用于 Prompt', async () => {
      createTestSkill(
        'music',
        `id: music
name: 音乐控制
description: 音乐播放控制
domain: music
priority: 1
enabled: true
capabilities:
  - name: play_music
    description: 播放音乐
    examples:
      - 播放周杰伦
      - 播放流行歌曲
`,
        '# 音乐指令'
      )

      orchestrator = new FileBasedSkillOrchestrator(mockLLMProvider, {
        skillsDirectory: TEST_SKILLS_DIR,
      })

      await orchestrator.initialize()

      const descriptions = await orchestrator.getCapabilityDescriptions()

      expect(descriptions).toContain('music')
      expect(descriptions).toContain('音乐控制')
      expect(descriptions).toContain('play_music')
      expect(descriptions).toContain('播放音乐')
    })
  })

  describe('错误处理', () => {
    it('应该处理空 Skills 目录', async () => {
      orchestrator = new FileBasedSkillOrchestrator(mockLLMProvider, {
        skillsDirectory: TEST_SKILLS_DIR,
      })

      await orchestrator.initialize()

      expect(orchestrator.getSkills()).toHaveLength(0)
    })

    it('应该处理无效的 skill.yaml', async () => {
      const skillDir = path.join(TEST_SKILLS_DIR, 'invalid')
      fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(path.join(skillDir, 'skill.yaml'), 'invalid yaml content: [')

      orchestrator = new FileBasedSkillOrchestrator(mockLLMProvider, {
        skillsDirectory: TEST_SKILLS_DIR,
      })

      await orchestrator.initialize()

      expect(orchestrator.getSkills()).toHaveLength(0)
    })
  })
})
