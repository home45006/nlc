import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DialogManager } from '../../dialog/dialog-manager.js'
import type { LLMProvider, ChatResponse, ToolCall } from '../../types/index.js'

// 创建 Mock LLM Provider
function createMockProvider(response: Partial<ChatResponse> = {}): LLMProvider {
  return {
    name: 'mock-provider',
    chat: vi.fn().mockResolvedValue({
      content: '好的，已为您打开空调。',
      toolCalls: [],
      usage: { promptTokens: 100, completionTokens: 20 },
      ...response,
    }),
    streamChat: vi.fn().mockImplementation(async (request, onChunk) => {
      const content = '好的，已为您打开空调。'
      // 模拟流式输出
      for (const char of content) {
        await onChunk(char)
      }
      return {
        content,
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 20 },
        ...response,
      }
    }),
  }
}

describe('DialogManager', () => {
  let manager: DialogManager
  let mockProvider: LLMProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    manager = new DialogManager(mockProvider)
  })

  describe('初始化', () => {
    it('应该初始化状态管理器', () => {
      const state = manager.stateManager.getState()

      expect(state.ac.isOn).toBe(false)
      expect(state.music.volume).toBe(50)
    })

    it('应该初始化空的历史记录', () => {
      const history = manager.getHistory()

      expect(history).toHaveLength(0)
    })
  })

  describe('handleInput', () => {
    it('应该处理简单的对话输入', async () => {
      mockProvider = createMockProvider({
        content: '我是小智，您的智能座舱助手。',
        toolCalls: [],
      })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('你叫什么名字')

      expect(result.output.ttsText).toBe('我是小智，您的智能座舱助手。')
      expect(result.stateChanges).toHaveLength(0)
    })

    it('应该处理包含工具调用的输入', async () => {
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
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('打开空调')

      expect(result.output.hasCommand).toBe(true)
      expect(result.stateChanges).toHaveLength(1)
      expect(result.stateChanges[0]).toEqual({
        field: '空调',
        from: '关闭',
        to: '开启',
      })
    })

    it('应该更新历史记录', async () => {
      mockProvider = createMockProvider({
        content: '好的回复',
        toolCalls: [],
      })
      manager = new DialogManager(mockProvider)

      await manager.handleInput('第一条消息')
      await manager.handleInput('第二条消息')

      const history = manager.getHistory()
      expect(history).toHaveLength(4) // 2 user + 2 assistant
      expect(history[0].content).toBe('第一条消息')
      expect(history[2].content).toBe('第二条消息')
    })

    it('应该为工具调用生成TTS文本（如果LLM未提供）', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'set_temperature', temperature: 24 }),
          },
        },
      ]

      mockProvider = createMockProvider({
        content: '', // LLM 未提供 TTS
        toolCalls,
      })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('空调调到24度')

      expect(result.output.ttsText).toContain('已为您')
      expect(result.output.ttsText).toContain('24')
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

      mockProvider = createMockProvider({
        content: '',
        toolCalls,
      })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('打开空调并播放音乐')

      expect(result.stateChanges).toHaveLength(2)
      expect(result.stateChanges[0].field).toBe('空调')
      expect(result.stateChanges[1].field).toBe('音乐')
    })
  })

  describe('历史记录管理', () => {
    it('应该记录工具调用的完整历史', async () => {
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
        content: '好的',
        toolCalls,
      })
      manager = new DialogManager(mockProvider)

      await manager.handleInput('打开空调')

      const history = manager.getHistory()
      // user → assistant(tool_call) → tool(response) → assistant(text)
      expect(history).toHaveLength(4)
      expect(history[0].role).toBe('user')
      expect(history[1].role).toBe('assistant')
      expect(history[1].tool_calls).toBeDefined()
      expect(history[2].role).toBe('tool')
      expect(history[3].role).toBe('assistant')
      expect(history[3].content).toBe('好的')
    })

    it('clearHistory应该清空历史', async () => {
      mockProvider = createMockProvider()
      manager = new DialogManager(mockProvider)

      await manager.handleInput('测试消息')

      manager.clearHistory()

      expect(manager.getHistory()).toHaveLength(0)
    })

    it('应该限制历史记录长度', async () => {
      mockProvider = createMockProvider()
      manager = new DialogManager(mockProvider)

      // 添加超过限制的消息
      for (let i = 0; i < 35; i++) {
        await manager.handleInput(`消息 ${i}`)
      }

      const history = manager.getHistory()
      expect(history.length).toBeLessThanOrEqual(60)
    })
  })

  describe('状态管理', () => {
    it('resetState应该重置车辆状态和历史', async () => {
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
      manager = new DialogManager(mockProvider)

      await manager.handleInput('打开空调')
      expect(manager.stateManager.getState().ac.isOn).toBe(true)

      manager.resetState()

      expect(manager.stateManager.getState().ac.isOn).toBe(false)
      expect(manager.getHistory()).toHaveLength(0)
    })
  })

  describe('switchProvider', () => {
    it('应该切换到新的LLM提供商', async () => {
      const newProvider = createMockProvider({
        content: '新提供商的回复',
      })

      manager.switchProvider(newProvider)

      const result = await manager.handleInput('测试')

      expect(result.output.ttsText).toBe('新提供商的回复')
    })
  })

  describe('generateTtsFromChanges', () => {
    it('应该为空调操作生成自然的TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'set_temperature', temperature: 24 }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('空调24度')

      expect(result.output.ttsText).toContain('24')
      expect(result.output.ttsText).toContain('度')
    })

    it('应该为音乐操作生成自然的TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_music',
            arguments: JSON.stringify({
              action: 'search_and_play',
              query: '周杰伦 晴天',
            }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('播放周杰伦的晴天')

      expect(result.output.ttsText).toContain('搜索并播放')
      expect(result.output.ttsText).toContain('周杰伦 晴天')
    })

    it('应该为导航操作生成自然的TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_navigation',
            arguments: JSON.stringify({
              action: 'set_destination',
              destination: '天安门',
            }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('导航到天安门')

      expect(result.output.ttsText).toContain('导航到')
      expect(result.output.ttsText).toContain('天安门')
    })

    it('当没有状态变更时应该返回默认消息', async () => {
      mockProvider = createMockProvider({
        content: '',
        toolCalls: [],
        usage: { promptTokens: 50, completionTokens: 10 },
      })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('你好')

      expect(result.output.ttsText).toBe('')
    })

    it('应该为打开空调生成TTS', async () => {
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

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('打开空调')

      expect(result.output.ttsText).toContain('打开空调')
    })

    it('应该为关闭空调生成TTS', async () => {
      // 先打开空调
      const openToolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'turn_on' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls: openToolCalls })
      manager = new DialogManager(mockProvider)
      await manager.handleInput('打开空调')

      // 然后关闭空调
      const closeToolCalls: ToolCall[] = [
        {
          id: 'call_2',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'turn_off' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls: closeToolCalls })
      manager.switchProvider(mockProvider)

      const result = await manager.handleInput('关闭空调')

      expect(result.output.ttsText).toContain('关闭空调')
    })

    it('应该为设置空调模式生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'set_mode', mode: 'cool' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('制冷模式')

      expect(result.output.ttsText).toContain('制冷')
    })

    it('应该为设置风速生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_ac',
            arguments: JSON.stringify({ action: 'set_fan_speed', fan_speed: 5 }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('风速5挡')

      expect(result.output.ttsText).toContain('5')
      expect(result.output.ttsText).toContain('挡')
    })

    it('应该为打开车窗生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_window',
            arguments: JSON.stringify({ action: 'open', position: 'front_left' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('打开主驾车窗')

      expect(result.output.ttsText).toContain('打开')
      expect(result.output.ttsText).toContain('主驾')
    })

    it('应该为关闭车窗生成TTS', async () => {
      // 先打开车窗
      const openToolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_window',
            arguments: JSON.stringify({ action: 'open', position: 'front_right' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls: openToolCalls })
      manager = new DialogManager(mockProvider)
      await manager.handleInput('打开副驾车窗')

      // 然后关闭车窗
      const closeToolCalls: ToolCall[] = [
        {
          id: 'call_2',
          type: 'function',
          function: {
            name: 'control_window',
            arguments: JSON.stringify({ action: 'close', position: 'front_right' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls: closeToolCalls })
      manager.switchProvider(mockProvider)

      const result = await manager.handleInput('关闭副驾车窗')

      expect(result.output.ttsText).toContain('关闭')
      expect(result.output.ttsText).toContain('副驾')
    })

    it('应该为设置车窗开度生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_window',
            arguments: JSON.stringify({ action: 'set_position', position: 'rear_left', open_percentage: 50 }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('车窗开一半')

      expect(result.output.ttsText).toContain('50%')
    })

    it('应该为座椅加热生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_seat',
            arguments: JSON.stringify({ action: 'heating_on', seat: 'driver' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('打开座椅加热')

      expect(result.output.ttsText).toContain('座椅加热')
    })

    it('应该为座椅通风生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_seat',
            arguments: JSON.stringify({ action: 'ventilation_on', seat: 'passenger' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('打开副驾通风')

      expect(result.output.ttsText).toContain('座椅通风')
    })

    it('应该为氛围灯生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_light',
            arguments: JSON.stringify({ action: 'set_color', light_type: 'ambient', color: '蓝色' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('氛围灯蓝色')

      expect(result.output.ttsText).toContain('氛围灯')
      expect(result.output.ttsText).toContain('蓝色')
    })

    it('应该为后备箱生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_trunk',
            arguments: JSON.stringify({ action: 'open' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('打开后备箱')

      expect(result.output.ttsText).toContain('后备箱')
    })

    it('应该为雨刮器生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_wiper',
            arguments: JSON.stringify({ action: 'set_speed', speed: 'high' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('雨刮高速')

      expect(result.output.ttsText).toContain('高速')
    })

    it('应该为音乐播放生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_music',
            arguments: JSON.stringify({ action: 'play' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('播放音乐')

      expect(result.output.ttsText).toContain('播放音乐')
    })

    it('应该为切歌生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_music',
            arguments: JSON.stringify({ action: 'next' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('下一首')

      expect(result.output.ttsText).toContain('下一首')
    })

    it('应该为音量调节生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_music',
            arguments: JSON.stringify({ action: 'set_volume', volume: 80 }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('音量80')

      expect(result.output.ttsText).toContain('80%')
    })

    it('应该为播放模式生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_music',
            arguments: JSON.stringify({ action: 'set_play_mode', play_mode: 'shuffle' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('随机播放')

      expect(result.output.ttsText).toContain('随机播放')
    })

    it('应该为路线偏好生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_navigation',
            arguments: JSON.stringify({ action: 'set_route_preference', route_preference: 'no_highway' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('不走高速')

      expect(result.output.ttsText).toContain('不走高速')
    })

    it('应该为取消导航生成TTS', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'control_navigation',
            arguments: JSON.stringify({ action: 'cancel' }),
          },
        },
      ]

      mockProvider = createMockProvider({ content: '', toolCalls })
      manager = new DialogManager(mockProvider)

      const result = await manager.handleInput('取消导航')

      expect(result.output.ttsText).toContain('取消导航')
    })
  })

  describe('错误处理', () => {
    it('应该处理LLM调用失败', async () => {
      mockProvider = {
        name: 'failing-provider',
        chat: vi.fn().mockRejectedValue(new Error('API 调用失败')),
      }
      manager = new DialogManager(mockProvider)

      await expect(manager.handleInput('测试')).rejects.toThrow('API 调用失败')
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
      manager = new DialogManager(mockProvider)

      await expect(manager.handleInput('测试')).rejects.toThrow()
    })
  })
})
