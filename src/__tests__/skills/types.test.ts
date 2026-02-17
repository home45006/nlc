/**
 * Skill 核心类型测试
 *
 * Phase 1: 验证 Skill 核心接口和类型定义
 */

import { describe, it, expect } from 'vitest'
import type {
  Skill,
  SkillCapability,
  SkillInput,
  SkillContext,
  SkillResult,
  SkillMetadata,
} from '../../skills/types.js'
import { Domain } from '../../types/domain.js'

describe('Skill Types', () => {
  describe('Skill 接口', () => {
    it('应该定义完整的 Skill 接口', () => {
      // 这个测试验证类型定义是否完整
      const mockSkill: Skill = {
        id: 'vehicle_control',
        name: '车辆控制',
        description: '控制车辆各项功能',
        domain: Domain.VEHICLE_CONTROL,
        capabilities: [],
        execute: async () => ({
          success: true,
          intent: 'test',
          slots: {},
          commands: [],
        }),
      }

      expect(mockSkill.id).toBe('vehicle_control')
      expect(mockSkill.name).toBe('车辆控制')
      expect(mockSkill.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(typeof mockSkill.execute).toBe('function')
    })

    it('应该支持可选的 metadata 字段', () => {
      const mockSkill: Skill = {
        id: 'music',
        name: '音乐控制',
        description: '音乐播放控制',
        domain: Domain.MUSIC,
        capabilities: [],
        metadata: {
          version: '1.0.0',
          author: 'test',
          tags: ['media', 'audio'],
        },
        execute: async () => ({
          success: true,
          intent: 'test',
          slots: {},
          commands: [],
        }),
      }

      expect(mockSkill.metadata?.version).toBe('1.0.0')
      expect(mockSkill.metadata?.tags).toContain('media')
    })
  })

  describe('SkillCapability 接口', () => {
    it('应该定义能力描述用于渐进式披露', () => {
      const capability: SkillCapability = {
        name: 'ac_control',
        description: '控制空调开关、温度、模式',
        examples: ['打开空调', '把温度调到24度', '开启制冷模式'],
        slots: [
          { name: 'action', type: 'string', required: true },
          { name: 'temperature', type: 'number', required: false },
        ],
      }

      expect(capability.name).toBe('ac_control')
      expect(capability.examples).toHaveLength(3)
      expect(capability.slots).toBeDefined()
      expect(capability.slots?.[0].name).toBe('action')
    })

    it('应该支持简洁的能力描述（无 slots）', () => {
      const capability: SkillCapability = {
        name: 'volume_control',
        description: '控制音量大小',
        examples: ['调大音量', '音量调到50'],
      }

      expect(capability.name).toBe('volume_control')
      expect(capability.slots).toBeUndefined()
    })
  })

  describe('SkillInput 类型', () => {
    it('应该包含路由信息和改写后的查询', () => {
      const input: SkillInput = {
        originalQuery: '打开空调',
        rewrittenQuery: '用户想要打开空调',
        confidence: 0.95,
        contextInfo: {
          previousDomain: Domain.MUSIC,
          isInherited: false,
        },
      }

      expect(input.originalQuery).toBe('打开空调')
      expect(input.rewrittenQuery).toBe('用户想要打开空调')
      expect(input.confidence).toBe(0.95)
      expect(input.contextInfo?.previousDomain).toBe(Domain.MUSIC)
    })
  })

  describe('SkillContext 类型', () => {
    it('应该包含执行上下文信息', () => {
      const context: SkillContext = {
        vehicleState: {
          ac: { isOn: false, temperature: 26, mode: 'auto', fanSpeed: 2 },
          windows: { driver: 0, passenger: 0, rearLeft: 0, rearRight: 0 },
          seats: {
            driver: { heating: 0, ventilation: 0 },
            passenger: { heating: 0, ventilation: 0 },
          },
          lights: { main: false, fog: false, hazard: false },
          trunk: { isOpen: false },
          wiper: { speed: 0 },
        },
        dialogHistory: [],
        previousDomain: Domain.CHAT,
      }

      expect(context.vehicleState.ac.isOn).toBe(false)
      expect(context.dialogHistory).toEqual([])
      expect(context.previousDomain).toBe(Domain.CHAT)
    })
  })

  describe('SkillResult 类型', () => {
    it('应该定义成功的结果', () => {
      const result: SkillResult = {
        success: true,
        intent: 'ac_toggle',
        slots: { action: 'turn_on' },
        commands: [
          { type: 'control_ac', params: { action: 'turn_on' }, domain: Domain.VEHICLE_CONTROL },
        ],
        ttsText: '已为您打开空调',
        confidence: 0.95,
      }

      expect(result.success).toBe(true)
      expect(result.intent).toBe('ac_toggle')
      expect(result.commands).toHaveLength(1)
      expect(result.ttsText).toBe('已为您打开空调')
    })

    it('应该定义失败的结果', () => {
      const result: SkillResult = {
        success: false,
        intent: 'unknown',
        slots: {},
        commands: [],
        error: '无法识别的指令',
        confidence: 0,
      }

      expect(result.success).toBe(false)
      expect(result.error).toBe('无法识别的指令')
    })

    it('应该支持 shouldContinue 字段', () => {
      const result: SkillResult = {
        success: true,
        intent: 'reply',
        slots: {},
        commands: [],
        ttsText: '好的',
        shouldContinue: false,
        confidence: 0.9,
      }

      expect(result.shouldContinue).toBe(false)
    })
  })

  describe('SkillMetadata 类型', () => {
    it('应该定义可选的元数据', () => {
      const metadata: SkillMetadata = {
        version: '1.0.0',
        author: 'team-alpha',
        tags: ['vehicle', 'control'],
        priority: 1,
        enabled: true,
      }

      expect(metadata.version).toBe('1.0.0')
      expect(metadata.priority).toBe(1)
      expect(metadata.enabled).toBe(true)
    })
  })
})
