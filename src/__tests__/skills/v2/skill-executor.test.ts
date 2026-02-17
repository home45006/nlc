/**
 * SkillExecutor 测试
 *
 * Phase 3 (TDD): 测试 Skill 能力执行器
 *
 * 测试覆盖：
 * - 执行单个能力
 * - 槽位验证
 * - 指令生成
 * - 错误处理
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SkillExecutor } from '../../../skills/v2/skill-executor.js'
import type { SkillContext, SkillResult } from '../../../skills/types.js'
import type { VehicleState } from '../../../types/vehicle.js'
import type { ChatMessage } from '../../../types/llm.js'

// Mock 车辆状态
const mockVehicleState: VehicleState = {
  ac: {
    power: false,
    temperature: 24,
    mode: 'auto',
    fanSpeed: 3,
  },
  windows: {
    frontLeft: 0,
    frontRight: 0,
    rearLeft: 0,
    rearRight: 0,
  },
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

// Mock 上下文
const mockContext: SkillContext = {
  vehicleState: mockVehicleState,
  dialogHistory: [] as ChatMessage[],
  previousDomain: undefined,
}

// Mock 能力处理器映射
const mockCapabilityHandlers = {
  vehicle_control: {
    ac_control: async (slots: Record<string, unknown>) => ({
      success: true,
      commands: [{ type: 'control_ac', params: { power: true } }],
      ttsText: '已为您打开空调',
    }),
    window_control: async (slots: Record<string, unknown>) => ({
      success: true,
      commands: [{ type: 'control_window', params: { position: 'all', percentage: 100 } }],
      ttsText: '已为您打开车窗',
    }),
  },
  music: {
    play_music: async (slots: Record<string, unknown>) => ({
      success: true,
      commands: [{ type: 'control_music', params: { action: 'play', artist: slots.artist } }],
      ttsText: `正在播放${slots.artist}的歌曲`,
    }),
  },
}

describe('SkillExecutor', () => {
  let executor: SkillExecutor

  beforeEach(() => {
    executor = new SkillExecutor(mockCapabilityHandlers as any)
  })

  describe('executeCapability', () => {
    it('应该执行车辆控制能力', async () => {
      const result = await executor.executeCapability(
        'vehicle_control',
        'ac_control',
        { action: 'turn_on' },
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].type).toBe('control_ac')
      expect(result.ttsText).toBe('已为您打开空调')
    })

    it('应该执行音乐控制能力', async () => {
      const result = await executor.executeCapability(
        'music',
        'play_music',
        { artist: '周杰伦' },
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].type).toBe('control_music')
      expect(result.ttsText).toContain('周杰伦')
    })

    it('应该返回错误当能力不存在', async () => {
      const result = await executor.executeCapability(
        'unknown_skill',
        'unknown_capability',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown capability')
    })

    it('应该返回错误当 Skill 不存在', async () => {
      const result = await executor.executeCapability(
        'non_existent',
        'some_capability',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown capability')
    })

    it('应该处理处理器抛出的异常', async () => {
      const errorExecutor = new SkillExecutor({
        error_skill: {
          error_cap: async () => {
            throw new Error('Handler error')
          },
        },
      } as any)

      const result = await errorExecutor.executeCapability(
        'error_skill',
        'error_cap',
        {},
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Handler error')
    })
  })

  describe('executeCapabilityWithValidation', () => {
    it('应该验证必需槽位', async () => {
      // 使用带槽位定义的处理器
      const executorWithValidation = new SkillExecutor(
        {
          vehicle_control: {
            ac_control: async (slots: Record<string, unknown>) => ({
              success: true,
              commands: [],
              ttsText: 'OK',
            }),
          },
        } as any,
        {
          vehicle_control: {
            ac_control: {
              slots: [
                { name: 'action', type: 'enum', required: true, description: '操作类型' },
                { name: 'temperature', type: 'number', required: false, description: '温度' },
              ],
            },
          },
        } as any
      )

      // 缺少必需槽位
      const result = await executorWithValidation.executeCapabilityWithValidation(
        'vehicle_control',
        'ac_control',
        {}, // 缺少 action
        mockContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required slot')
    })

    it('应该通过验证当提供必需槽位', async () => {
      const executorWithValidation = new SkillExecutor(
        {
          vehicle_control: {
            ac_control: async (slots: Record<string, unknown>) => ({
              success: true,
              commands: [],
              ttsText: 'OK',
            }),
          },
        } as any,
        {
          vehicle_control: {
            ac_control: {
              slots: [
                { name: 'action', type: 'enum', required: true, description: '操作类型' },
              ],
            },
          },
        } as any
      )

      const result = await executorWithValidation.executeCapabilityWithValidation(
        'vehicle_control',
        'ac_control',
        { action: 'turn_on' },
        mockContext
      )

      expect(result.success).toBe(true)
    })
  })

  describe('executeMultipleCapabilities', () => {
    it('应该并行执行多个能力', async () => {
      const executorWithAll = new SkillExecutor({
        vehicle_control: {
          ac_control: async () => ({
            success: true,
            commands: [{ type: 'control_ac', params: {} }],
            ttsText: '空调已打开',
          }),
          window_control: async () => ({
            success: true,
            commands: [{ type: 'control_window', params: {} }],
            ttsText: '车窗已打开',
          }),
        },
      } as any)

      const results = await executorWithAll.executeMultipleCapabilities(
        [
          { skillId: 'vehicle_control', capability: 'ac_control', slots: {} },
          { skillId: 'vehicle_control', capability: 'window_control', slots: {} },
        ],
        mockContext
      )

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('应该汇总所有指令', async () => {
      const executorWithAll = new SkillExecutor({
        vehicle_control: {
          ac_control: async () => ({
            success: true,
            commands: [{ type: 'control_ac', params: { temp: 24 } }],
            ttsText: '空调',
          }),
          window_control: async () => ({
            success: true,
            commands: [{ type: 'control_window', params: { pos: 'all' } }],
            ttsText: '车窗',
          }),
        },
      } as any)

      const results = await executorWithAll.executeMultipleCapabilities(
        [
          { skillId: 'vehicle_control', capability: 'ac_control', slots: {} },
          { skillId: 'vehicle_control', capability: 'window_control', slots: {} },
        ],
        mockContext
      )

      const allCommands = results.flatMap(r => r.commands)
      expect(allCommands).toHaveLength(2)
    })
  })

  describe('getCapabilityHandler', () => {
    it('应该返回能力处理器', () => {
      const handler = executor.getCapabilityHandler('vehicle_control', 'ac_control')
      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('应该返回 undefined 当处理器不存在', () => {
      const handler = executor.getCapabilityHandler('unknown', 'unknown')
      expect(handler).toBeUndefined()
    })
  })

  describe('registerCapabilityHandler', () => {
    it('应该动态注册新的能力处理器', async () => {
      executor.registerCapabilityHandler('new_skill', 'new_capability', async (slots) => ({
        success: true,
        commands: [],
        ttsText: 'New capability executed',
      }))

      const result = await executor.executeCapability(
        'new_skill',
        'new_capability',
        {},
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.ttsText).toBe('New capability executed')
    })
  })
})
