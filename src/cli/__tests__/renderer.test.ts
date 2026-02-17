import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  renderVerboseResult,
  type VerboseResult,
} from '../renderer.js'
import type { StateChange } from '../../types/index.js'
import type { Command } from '../../core/types.js'
import type { OrchestrationResult } from '../../skills/v2/file-based-orchestrator.js'

describe('renderer', () => {
  // Mock console.log
  const originalLog = console.log
  let mockLog: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLog = vi.fn()
    console.log = mockLog
  })

  afterEach(() => {
    console.log = originalLog
    vi.clearAllMocks()
  })

  describe('renderVerboseResult', () => {
    it('应该渲染用户输入阶段', () => {
      const result: VerboseResult = {
        userInput: '打开空调',
        orchestrationResult: undefined,
        stateChanges: [],
        commands: [],
        timings: {
          orchestrator: 100,
          execution: 10,
          total: 110,
        },
      }

      renderVerboseResult(result)

      // 检查是否输出包含用户输入
      const calls = mockLog.mock.calls.flat().join('\n')
      expect(calls).toContain('打开空调')
      expect(calls).toContain('输入长度: 4 字符')
    })

    it('应该渲染识别的意图', () => {
      const orchestrationResult: OrchestrationResult = {
        success: true,
        response: '好的，已为您打开空调',
        skillResults: [],
        commands: [],
        intents: [
          {
            skillId: 'vehicle_control',
            capability: 'ac_control',
            slots: { action: 'turn_on' },
            confidence: 0.95,
          },
        ],
      }

      const result: VerboseResult = {
        userInput: '打开空调',
        orchestrationResult,
        stateChanges: [],
        commands: [],
        timings: {
          orchestrator: 100,
          execution: 10,
          total: 110,
        },
      }

      renderVerboseResult(result)

      const calls = mockLog.mock.calls.flat().join('\n')
      expect(calls).toContain('vehicle_control')
      expect(calls).toContain('ac_control')
      expect(calls).toContain('95%')
    })

    it('应该渲染命令执行阶段', () => {
      const commands: Command[] = [
        { type: 'control_ac', params: { action: 'turn_on' } },
      ]

      const result: VerboseResult = {
        userInput: '打开空调',
        orchestrationResult: {
          success: true,
          response: '好的',
          skillResults: [],
          commands,
        },
        stateChanges: [],
        commands,
        timings: {
          orchestrator: 100,
          execution: 5,
          total: 105,
        },
      }

      renderVerboseResult(result)

      const calls = mockLog.mock.calls.flat().join('\n')
      expect(calls).toContain('control_ac')
      expect(calls).toContain('生成命令数: 1')
    })

    it('应该渲染状态变更阶段', () => {
      const stateChanges: StateChange[] = [
        { field: 'ac.isOn', from: 'false', to: 'true' },
        { field: 'ac.temperature', from: '22', to: '24' },
      ]

      const result: VerboseResult = {
        userInput: '打开空调调到24度',
        orchestrationResult: {
          success: true,
          response: '好的',
          skillResults: [],
          commands: [],
        },
        stateChanges,
        commands: [],
        timings: {
          orchestrator: 100,
          execution: 5,
          total: 105,
        },
      }

      renderVerboseResult(result)

      const calls = mockLog.mock.calls.flat().join('\n')
      expect(calls).toContain('ac.isOn')
      expect(calls).toContain('ac.temperature')
      expect(calls).toContain('状态变更数: 2')
    })

    it('应该渲染总耗时', () => {
      const result: VerboseResult = {
        userInput: '测试',
        orchestrationResult: undefined,
        stateChanges: [],
        commands: [],
        timings: {
          orchestrator: 500,
          execution: 50,
          total: 550,
        },
      }

      renderVerboseResult(result)

      const calls = mockLog.mock.calls.flat().join('\n')
      expect(calls).toContain('550ms')
      expect(calls).toContain('0.55s')
    })

    it('应该处理无意图的情况', () => {
      const result: VerboseResult = {
        userInput: '今天天气怎么样',
        orchestrationResult: {
          success: true,
          response: '对不起，我无法查询天气',
          skillResults: [],
          commands: [],
          intents: [],
        },
        stateChanges: [],
        commands: [],
        timings: {
          orchestrator: 100,
          execution: 10,
          total: 110,
        },
      }

      renderVerboseResult(result)

      const calls = mockLog.mock.calls.flat().join('\n')
      expect(calls).toContain('无（使用 Chat 处理）')
    })

    it('应该处理失败的处理状态', () => {
      const result: VerboseResult = {
        userInput: '测试',
        orchestrationResult: {
          success: false,
          response: '',
          skillResults: [],
          commands: [],
          error: '处理失败',
        },
        stateChanges: [],
        commands: [],
        timings: {
          orchestrator: 100,
          execution: 10,
          total: 110,
        },
      }

      renderVerboseResult(result)

      const calls = mockLog.mock.calls.flat().join('\n')
      expect(calls).toContain('失败')
    })
  })
})
