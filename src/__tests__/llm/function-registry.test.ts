import { describe, it, expect, beforeEach } from 'vitest'
import { FunctionRegistry } from '../../llm/function-registry.js'
import { Domain } from '../../types/index.js'

describe('FunctionRegistry', () => {
  let registry: FunctionRegistry

  beforeEach(() => {
    registry = new FunctionRegistry()
  })

  describe('getAllTools', () => {
    it('应该返回所有工具定义', () => {
      const tools = registry.getAllTools()

      expect(tools.length).toBeGreaterThan(0)
      expect(Array.isArray(tools)).toBe(true)
    })

    it('应该包含空调控制工具', () => {
      const tools = registry.getAllTools()
      const acTool = tools.find(t => t.function.name === 'control_ac')

      expect(acTool).toBeDefined()
      expect(acTool?.function.description).toContain('空调')
    })

    it('应该包含车窗控制工具', () => {
      const tools = registry.getAllTools()
      const windowTool = tools.find(t => t.function.name === 'control_window')

      expect(windowTool).toBeDefined()
      expect(windowTool?.function.description).toContain('车窗')
    })

    it('应该包含音乐控制工具', () => {
      const tools = registry.getAllTools()
      const musicTool = tools.find(t => t.function.name === 'control_music')

      expect(musicTool).toBeDefined()
      expect(musicTool?.function.description).toContain('音乐')
    })

    it('应该包含导航控制工具', () => {
      const tools = registry.getAllTools()
      const navTool = tools.find(t => t.function.name === 'control_navigation')

      expect(navTool).toBeDefined()
      expect(navTool?.function.description).toContain('导航')
    })

    it('所有工具应该有有效的参数定义', () => {
      const tools = registry.getAllTools()

      for (const tool of tools) {
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBeDefined()
        expect(tool.function.description).toBeDefined()
        expect(tool.function.parameters).toBeDefined()
        expect(tool.function.parameters.type).toBe('object')
      }
    })
  })

  describe('resolve', () => {
    it('应该解析空调控制到正确的域和意图', () => {
      const meta = registry.resolve('control_ac', { action: 'turn_on' })

      expect(meta.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(meta.intent).toBe('ac_control_turn_on')
    })

    it('应该解析车窗控制到正确的域和意图', () => {
      const meta = registry.resolve('control_window', { action: 'open', position: 'front_left' })

      expect(meta.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(meta.intent).toBe('window_control_open')
    })

    it('应该解析音乐控制到正确的域和意图', () => {
      const meta = registry.resolve('control_music', { action: 'play' })

      expect(meta.domain).toBe(Domain.MUSIC)
      expect(meta.intent).toBe('music_control_play')
    })

    it('应该解析导航控制到正确的域和意图', () => {
      const meta = registry.resolve('control_navigation', { action: 'set_destination' })

      expect(meta.domain).toBe(Domain.NAVIGATION)
      expect(meta.intent).toBe('navigation_control_set_destination')
    })

    it('应该为未知函数返回CHAT域', () => {
      const meta = registry.resolve('unknown_function', {})

      expect(meta.domain).toBe(Domain.CHAT)
      expect(meta.intent).toBe('unknown')
    })

    it('应该处理没有action参数的情况', () => {
      const meta = registry.resolve('control_ac', {})

      expect(meta.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(meta.intent).toBe('ac_control')
    })

    it('应该为座椅控制返回正确的域和意图', () => {
      const meta = registry.resolve('control_seat', { action: 'heating_on', seat: 'driver' })

      expect(meta.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(meta.intent).toBe('seat_control_heating_on')
    })

    it('应该为灯光控制返回正确的域和意图', () => {
      const meta = registry.resolve('control_light', {
        action: 'turn_on',
        light_type: 'ambient',
      })

      expect(meta.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(meta.intent).toBe('light_control_turn_on')
    })

    it('应该为后备箱控制返回正确的域和意图', () => {
      const meta = registry.resolve('control_trunk', { action: 'open' })

      expect(meta.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(meta.intent).toBe('trunk_control_open')
    })

    it('应该为雨刮器控制返回正确的域和意图', () => {
      const meta = registry.resolve('control_wiper', { action: 'set_speed', speed: 'high' })

      expect(meta.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(meta.intent).toBe('wiper_control_set_speed')
    })
  })
})
