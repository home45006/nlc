/**
 * Skill V2 类型测试
 *
 * Phase 1 (TDD): 测试文件系统级 Skills 的类型定义
 *
 * 测试覆盖：
 * - SkillMetadataYaml 结构
 * - SkillInstructions 结构
 * - CapabilityDefinition 结构
 * - 类型守卫
 */

import { describe, it, expect } from 'vitest'
import {
  type SkillMetadataYaml,
  type CapabilityDefinition,
  type SlotDefinition,
  isSkillMetadataYaml,
  isCapabilityDefinition,
} from '../../../skills/v2/types.js'

describe('SkillMetadataYaml 类型', () => {
  describe('必需字段', () => {
    it('应该包含 id 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'vehicle_control',
        name: '车辆控制',
        description: '控制车辆功能',
        domain: 'vehicle_control',
      }

      expect(metadata.id).toBe('vehicle_control')
    })

    it('应该包含 name 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'test',
        name: '测试技能',
        description: '描述',
        domain: 'chat',
      }

      expect(metadata.name).toBe('测试技能')
    })

    it('应该包含 description 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'test',
        name: 'Test',
        description: '这是一个测试技能',
        domain: 'music',
      }

      expect(metadata.description).toBe('这是一个测试技能')
    })

    it('应该包含 domain 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        domain: 'navigation',
      }

      expect(metadata.domain).toBe('navigation')
    })
  })

  describe('可选字段', () => {
    it('应该支持 version 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        domain: 'chat',
        version: '1.0.0',
      }

      expect(metadata.version).toBe('1.0.0')
    })

    it('应该支持 priority 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        domain: 'chat',
        priority: 50,
      }

      expect(metadata.priority).toBe(50)
    })

    it('应该支持 enabled 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        domain: 'chat',
        enabled: false,
      }

      expect(metadata.enabled).toBe(false)
    })

    it('应该支持 tags 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        domain: 'music',
        tags: ['audio', 'media'],
      }

      expect(metadata.tags).toContain('audio')
      expect(metadata.tags).toContain('media')
    })

    it('应该支持 capabilities 字段', () => {
      const metadata: SkillMetadataYaml = {
        id: 'vehicle_control',
        name: '车辆控制',
        description: '控制车辆',
        domain: 'vehicle_control',
        capabilities: [
          { name: 'ac_control', description: '空调控制' },
          { name: 'window_control', description: '车窗控制' },
        ],
      }

      expect(metadata.capabilities).toHaveLength(2)
      expect(metadata.capabilities?.[0].name).toBe('ac_control')
    })
  })
})

describe('CapabilityDefinition 类型', () => {
  describe('必需字段', () => {
    it('应该包含 name 字段', () => {
      const capability: CapabilityDefinition = {
        name: 'ac_control',
        description: '空调控制',
      }

      expect(capability.name).toBe('ac_control')
    })

    it('应该包含 description 字段', () => {
      const capability: CapabilityDefinition = {
        name: 'play_music',
        description: '播放音乐',
      }

      expect(capability.description).toBe('播放音乐')
    })
  })

  describe('可选字段', () => {
    it('应该支持 examples 字段', () => {
      const capability: CapabilityDefinition = {
        name: 'ac_control',
        description: '空调控制',
        examples: ['打开空调', '温度调到24度'],
      }

      expect(capability.examples).toHaveLength(2)
      expect(capability.examples).toContain('打开空调')
    })

    it('应该支持 slots 字段', () => {
      const capability: CapabilityDefinition = {
        name: 'ac_control',
        description: '空调控制',
        slots: [
          { name: 'temperature', type: 'number', description: '目标温度', required: false },
          { name: 'action', type: 'enum', enumValues: ['on', 'off'], required: true },
        ],
      }

      expect(capability.slots).toHaveLength(2)
      expect(capability.slots?.[0].name).toBe('temperature')
    })

    it('应该支持 keywords 字段', () => {
      const capability: CapabilityDefinition = {
        name: 'ac_control',
        description: '空调控制',
        keywords: ['空调', '温度', '冷气'],
      }

      expect(capability.keywords).toContain('空调')
      expect(capability.keywords).toContain('温度')
    })
  })
})

describe('SlotDefinition 类型', () => {
  it('应该支持 string 类型槽位', () => {
    const slot: SlotDefinition = {
      name: 'destination',
      type: 'string',
      description: '目的地名称',
      required: true,
    }

    expect(slot.type).toBe('string')
    expect(slot.required).toBe(true)
  })

  it('应该支持 number 类型槽位', () => {
    const slot: SlotDefinition = {
      name: 'temperature',
      type: 'number',
      description: '温度值',
      required: false,
    }

    expect(slot.type).toBe('number')
  })

  it('应该支持 boolean 类型槽位', () => {
    const slot: SlotDefinition = {
      name: 'power',
      type: 'boolean',
      description: '开关状态',
      required: true,
    }

    expect(slot.type).toBe('boolean')
  })

  it('应该支持 enum 类型槽位', () => {
    const slot: SlotDefinition = {
      name: 'mode',
      type: 'enum',
      enumValues: ['cool', 'heat', 'auto'],
      description: '空调模式',
      required: false,
    }

    expect(slot.type).toBe('enum')
    expect(slot.enumValues).toContain('cool')
    expect(slot.enumValues).toContain('heat')
  })

  it('应该支持 min/max 约束', () => {
    const slot: SlotDefinition = {
      name: 'temperature',
      type: 'number',
      description: '温度',
      min: 16,
      max: 32,
      required: true,
    }

    expect(slot.min).toBe(16)
    expect(slot.max).toBe(32)
  })
})

describe('类型守卫', () => {
  describe('isSkillMetadataYaml', () => {
    it('应该返回 true 对于有效的 SkillMetadataYaml', () => {
      const valid = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        domain: 'chat',
      }

      expect(isSkillMetadataYaml(valid)).toBe(true)
    })

    it('应该返回 false 当缺少 id', () => {
      const invalid = {
        name: 'Test',
        description: 'Desc',
        domain: 'chat',
      }

      expect(isSkillMetadataYaml(invalid)).toBe(false)
    })

    it('应该返回 false 当缺少 name', () => {
      const invalid = {
        id: 'test',
        description: 'Desc',
        domain: 'chat',
      }

      expect(isSkillMetadataYaml(invalid)).toBe(false)
    })

    it('应该返回 false 当缺少 description', () => {
      const invalid = {
        id: 'test',
        name: 'Test',
        domain: 'chat',
      }

      expect(isSkillMetadataYaml(invalid)).toBe(false)
    })

    it('应该返回 false 当缺少 domain', () => {
      const invalid = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
      }

      expect(isSkillMetadataYaml(invalid)).toBe(false)
    })

    it('应该返回 false 对于 null', () => {
      expect(isSkillMetadataYaml(null)).toBe(false)
    })

    it('应该返回 false 对于 undefined', () => {
      expect(isSkillMetadataYaml(undefined)).toBe(false)
    })

    it('应该返回 false 对于非对象类型', () => {
      expect(isSkillMetadataYaml('string')).toBe(false)
      expect(isSkillMetadataYaml(123)).toBe(false)
      expect(isSkillMetadataYaml([])).toBe(false)
    })
  })

  describe('isCapabilityDefinition', () => {
    it('应该返回 true 对于有效的 CapabilityDefinition', () => {
      const valid = {
        name: 'ac_control',
        description: '空调控制',
      }

      expect(isCapabilityDefinition(valid)).toBe(true)
    })

    it('应该返回 false 当缺少 name', () => {
      const invalid = {
        description: '描述',
      }

      expect(isCapabilityDefinition(invalid)).toBe(false)
    })

    it('应该返回 false 当缺少 description', () => {
      const invalid = {
        name: 'test',
      }

      expect(isCapabilityDefinition(invalid)).toBe(false)
    })

    it('应该返回 false 对于 null', () => {
      expect(isCapabilityDefinition(null)).toBe(false)
    })
  })
})
