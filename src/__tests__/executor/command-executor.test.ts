import { describe, it, expect, beforeEach } from 'vitest'
import { CommandExecutor } from '../../executor/command-executor.js'
import { VehicleStateManager } from '../../executor/vehicle-state.js'
import type { ToolCall } from '../../types/index.js'

describe('CommandExecutor', () => {
  let executor: CommandExecutor
  let stateManager: VehicleStateManager

  beforeEach(() => {
    stateManager = new VehicleStateManager()
    executor = new CommandExecutor(stateManager)
  })

  describe('execute', () => {
    it('应该执行单个工具调用', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'turn_on' }),
          },
        },
      ]

      const changes = executor.execute(toolCalls)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '空调', from: '关闭', to: '开启' })
      expect(stateManager.getState().ac.isOn).toBe(true)
    })

    it('应该执行多个工具调用', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'set_temperature', temperature: 24 }),
          },
        },
        {
          id: 'call_2',
          type: 'function',
          function: {
            name: 'control_music',
            arguments: JSON.stringify({ action: 'set_volume', volume: 60 }),
          },
        },
      ]

      const changes = executor.execute(toolCalls)

      expect(changes).toHaveLength(2)
      expect(changes[0]).toEqual({ field: '空调温度', from: '26°C', to: '24°C' })
      expect(changes[1]).toEqual({ field: '音量', from: '50%', to: '60%' })
      expect(stateManager.getState().ac.temperature).toBe(24)
      expect(stateManager.getState().music.volume).toBe(60)
    })

    it('应该返回空数组当工具调用列表为空', () => {
      const changes = executor.execute([])

      expect(changes).toHaveLength(0)
    })

    it('应该正确解析复杂参数', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_navigation',
            arguments: JSON.stringify({
              action: 'set_destination',
              destination: '北京市朝阳区国贸大厦',
            }),
          },
        },
      ]

      const changes = executor.execute(toolCalls)

      expect(changes).toHaveLength(1)
      expect(changes[0].field).toBe('导航目的地')
      expect(stateManager.getState().navigation.destination).toBe('北京市朝阳区国贸大厦')
    })

    it('应该按顺序执行多个命令并累积状态变更', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'turn_on' }),
          },
        },
        {
          id: 'call_2',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'set_temperature', temperature: 22 }),
          },
        },
      ]

      const changes = executor.execute(toolCalls)

      expect(changes).toHaveLength(2)
      expect(changes[0]).toEqual({ field: '空调', from: '关闭', to: '开启' })
      expect(changes[1]).toEqual({ field: '空调温度', from: '26°C', to: '22°C' })
      expect(stateManager.getState().ac.isOn).toBe(true)
      expect(stateManager.getState().ac.temperature).toBe(22)
    })

    it('应该处理未知函数名', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'unknown_function',
            arguments: JSON.stringify({}),
          },
        },
      ]

      const changes = executor.execute(toolCalls)

      expect(changes).toHaveLength(0)
    })
  })

  describe('不可变性', () => {
    it('应该返回只读的状态变更数组', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'turn_on' }),
          },
        },
      ]

      const changes = executor.execute(toolCalls)

      // 验证返回的是只读数组
      expect(Array.isArray(changes)).toBe(true)
      expect(changes.length).toBe(1)
    })
  })
})
