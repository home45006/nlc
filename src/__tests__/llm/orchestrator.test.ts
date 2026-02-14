import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LLMOrchestrator } from '../../llm/orchestrator.js'
import type { LLMProvider, ChatResponse, ToolCall, ChatMessage } from '../../types/index.js'
import { Domain, createDefaultVehicleState } from '../../types/index.js'

function createMockProvider(response: Partial<ChatResponse> = {}): LLMProvider {
  return {
    name: 'mock-provider',
    chat: vi.fn().mockResolvedValue({
      content: '测试回复',
      toolCalls: [],
      usage: { promptTokens: 100, completionTokens: 20 },
      ...response,
    }),
  }
}

describe('LLMOrchestrator', () => {
  let orchestrator: LLMOrchestrator
  let mockProvider: LLMProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    orchestrator = new LLMOrchestrator(mockProvider)
  })

  describe('process', () => {
    it('应该处理无工具调用的对话', async () => {
      mockProvider = createMockProvider({
        content: '我是小智，您的智能座舱助手。',
        toolCalls: [],
      })
      orchestrator = new LLMOrchestrator(mockProvider)

      const result = await orchestrator.process(
        '你叫什么名字',
        [],
        createDefaultVehicleState()
      )

      expect(result.output.domain).toBe(Domain.CHAT)
      expect(result.output.intent).toBe('free_chat')
      expect(result.output.ttsText).toBe('我是小智，您的智能座舱助手。')
      expect(result.output.hasCommand).toBe(false)
      expect(result.toolCalls).toHaveLength(0)
    })

    it('应该处理包含工具调用的对话', async () => {
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

      mockProvider = createMockProvider({
        content: '好的，已为您打开空调。',
        toolCalls,
      })
      orchestrator = new LLMOrchestrator(mockProvider)

      const result = await orchestrator.process(
        '打开空调',
        [],
        createDefaultVehicleState()
      )

      expect(result.output.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(result.output.intent).toBe('ac_control_turn_on')
      expect(result.output.hasCommand).toBe(true)
      expect(result.toolCalls).toHaveLength(1)
      expect(result.output.slots).toEqual({ action: 'turn_on' })
    })

    it('应该处理多个工具调用', async () => {
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
            name: 'control_music',
            arguments: JSON.stringify({ action: 'play' }),
          },
        },
      ]

      mockProvider = createMockProvider({ toolCalls })
      orchestrator = new LLMOrchestrator(mockProvider)

      const result = await orchestrator.process(
        '打开空调并播放音乐',
        [],
        createDefaultVehicleState()
      )

      expect(result.toolCalls).toHaveLength(2)
      // 多个工具调用时，slots 是按函数名组织的
      expect(result.output.slots).toHaveProperty('control_ac')
      expect(result.output.slots).toHaveProperty('control_music')
    })

    it('应该包含元数据信息', async () => {
      mockProvider = createMockProvider({
        content: '测试',
        toolCalls: [],
      })
      orchestrator = new LLMOrchestrator(mockProvider)

      const result = await orchestrator.process(
        '测试',
        [],
        createDefaultVehicleState()
      )

      expect(result.output.meta.model).toBe('mock-provider')
      expect(result.output.meta.latencyMs).toBeGreaterThanOrEqual(0)
      expect(result.output.meta.tokens.prompt).toBe(100)
      expect(result.output.meta.tokens.completion).toBe(20)
    })

    it('应该传递历史消息', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        content: '回复',
        toolCalls: [],
        usage: { promptTokens: 50, completionTokens: 10 },
      })
      mockProvider = {
        name: 'test-provider',
        chat: chatMock,
      }
      orchestrator = new LLMOrchestrator(mockProvider)

      const history: ChatMessage[] = [
        { role: 'user', content: '历史消息1' },
        { role: 'assistant', content: '历史回复1' },
      ]

      await orchestrator.process('新消息', history, createDefaultVehicleState())

      expect(chatMock).toHaveBeenCalled()
      const callArgs = chatMock.mock.calls[0][0]
      expect(callArgs.messages.length).toBeGreaterThan(2) // system + history + user
    })

    it('应该正确设置temperature和maxTokens', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        content: '回复',
        toolCalls: [],
        usage: { promptTokens: 50, completionTokens: 10 },
      })
      mockProvider = {
        name: 'test-provider',
        chat: chatMock,
      }
      orchestrator = new LLMOrchestrator(mockProvider)

      await orchestrator.process('测试', [], createDefaultVehicleState())

      expect(chatMock).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
          maxTokens: 1024,
        })
      )
    })

    it('应该正确设置confidence', async () => {
      mockProvider = createMockProvider({
        content: '测试',
        toolCalls: [],
      })
      orchestrator = new LLMOrchestrator(mockProvider)

      const result = await orchestrator.process(
        '测试',
        [],
        createDefaultVehicleState()
      )

      expect(result.output.confidence).toBe(0.9)
    })

    it('工具调用时应该设置confidence为0.95', async () => {
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

      mockProvider = createMockProvider({ toolCalls })
      orchestrator = new LLMOrchestrator(mockProvider)

      const result = await orchestrator.process(
        '打开空调',
        [],
        createDefaultVehicleState()
      )

      expect(result.output.confidence).toBe(0.95)
    })
  })

  describe('getToolResponseText', () => {
    it('应该返回LLM的文本响应', async () => {
      mockProvider = createMockProvider({
        content: '操作已完成',
        toolCalls: [],
      })
      orchestrator = new LLMOrchestrator(mockProvider)

      const messages: ChatMessage[] = [
        { role: 'user', content: '打开空调' },
        { role: 'assistant', content: '', tool_calls: [] },
        { role: 'tool', content: '{"success":true}', tool_call_id: 'call_1' },
      ]

      const text = await orchestrator.getToolResponseText(messages)

      expect(text).toBe('操作已完成')
    })

    it('当content为null时应该返回默认消息', async () => {
      mockProvider = createMockProvider({
        content: null,
        toolCalls: [],
      })
      orchestrator = new LLMOrchestrator(mockProvider)

      const messages: ChatMessage[] = []

      const text = await orchestrator.getToolResponseText(messages)

      expect(text).toBe('操作已完成。')
    })

    it('应该使用正确的参数调用LLM', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        content: '回复',
        toolCalls: [],
        usage: { promptTokens: 50, completionTokens: 10 },
      })
      mockProvider = {
        name: 'test-provider',
        chat: chatMock,
      }
      orchestrator = new LLMOrchestrator(mockProvider)

      const messages: ChatMessage[] = [{ role: 'user', content: '测试' }]

      await orchestrator.getToolResponseText(messages)

      expect(chatMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
          temperature: 0.3,
          maxTokens: 256,
        })
      )
    })
  })

  describe('错误处理', () => {
    it('应该处理LLM调用失败', async () => {
      mockProvider = {
        name: 'failing-provider',
        chat: vi.fn().mockRejectedValue(new Error('API 调用失败')),
      }
      orchestrator = new LLMOrchestrator(mockProvider)

      await expect(
        orchestrator.process('测试', [], createDefaultVehicleState())
      ).rejects.toThrow('API 调用失败')
    })

    it('应该处理无效的工具调用参数', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: 'invalid json',
          },
        },
      ]

      mockProvider = createMockProvider({ toolCalls })
      orchestrator = new LLMOrchestrator(mockProvider)

      await expect(
        orchestrator.process('测试', [], createDefaultVehicleState())
      ).rejects.toThrow()
    })
  })
})
