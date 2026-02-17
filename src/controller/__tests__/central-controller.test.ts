/**
 * CentralController 测试 (V2 架构)
 *
 * 测试中央控制器的路由功能
 * 注意：V2 架构中，中央控制器不再依赖 SkillRegistry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CentralControllerImpl } from '../central-controller.js'
import type { LLMProvider, ChatResponse } from '../../types/llm.js'

// Mock LLM Provider
function createMockProvider(response: ChatResponse): LLMProvider {
  return {
    name: 'mock-provider',
    chat: vi.fn().mockResolvedValue(response),
  }
}

describe('CentralControllerImpl (V2)', () => {
  let mockProvider: LLMProvider

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('构造函数', () => {
    it('应该接受 provider 参数', () => {
      mockProvider = createMockProvider({
        content: '{"routings": []}',
        usage: { promptTokens: 10, completionTokens: 20 },
      })

      const controller = new CentralControllerImpl(mockProvider)

      expect(controller).toBeDefined()
    })

    it('应该支持配置对象构造方式', () => {
      mockProvider = createMockProvider({
        content: '{"routings": []}',
        usage: { promptTokens: 10, completionTokens: 20 },
      })

      const controller = new CentralControllerImpl({
        provider: mockProvider,
      })

      expect(controller).toBeDefined()
    })
  })

  describe('route 方法', () => {
    it('应该返回有效的路由结果', async () => {
      mockProvider = createMockProvider({
        content: JSON.stringify({
          routings: [
            { domain: 'music', rewrittenQuery: '播放周杰伦的歌', confidence: 0.95 },
          ],
          isSequential: false,
          overallConfidence: 0.95,
        }),
        usage: { promptTokens: 10, completionTokens: 20 },
      })

      const controller = new CentralControllerImpl(mockProvider)
      const result = await controller.route('播放周杰伦的歌', {
        vehicleState: {} as any,
        dialogHistory: [],
      })

      expect(result.routings).toHaveLength(1)
      expect(result.routings[0].domain).toBe('music')
      expect(result.routings[0].rewrittenQuery).toBe('播放周杰伦的歌')
    })

    it('应该使用默认 Prompt 进行路由', async () => {
      mockProvider = createMockProvider({
        content: JSON.stringify({
          routings: [
            { domain: 'navigation', rewrittenQuery: '导航去机场', confidence: 0.95 },
          ],
          isSequential: false,
          overallConfidence: 0.95,
        }),
        usage: { promptTokens: 10, completionTokens: 20 },
      })

      const controller = new CentralControllerImpl(mockProvider)
      await controller.route('导航去机场', {
        vehicleState: {} as any,
        dialogHistory: [],
      })

      // 验证 provider.chat 被调用
      expect(mockProvider.chat).toHaveBeenCalled()
      const callArgs = (mockProvider.chat as any).mock.calls[0][0]
      const systemMessage = callArgs.messages.find((m: any) => m.role === 'system')

      // Prompt 应该包含领域信息
      expect(systemMessage.content).toContain('领域路由')
    })

    it('应该处理多意图拆分', async () => {
      mockProvider = createMockProvider({
        content: JSON.stringify({
          routings: [
            { domain: 'vehicle_control', rewrittenQuery: '打开空调', confidence: 0.95 },
            { domain: 'music', rewrittenQuery: '播放周杰伦的歌', confidence: 0.95 },
          ],
          isSequential: true,
          overallConfidence: 0.95,
        }),
        usage: { promptTokens: 10, completionTokens: 20 },
      })

      const controller = new CentralControllerImpl(mockProvider)
      const result = await controller.route('打开空调，播放周杰伦的歌', {
        vehicleState: {} as any,
        dialogHistory: [],
      })

      expect(result.routings).toHaveLength(2)
      expect(result.routings[0].domain).toBe('vehicle_control')
      expect(result.routings[1].domain).toBe('music')
      expect(result.isSequential).toBe(true)
    })

    it('应该在 LLM 调用失败时返回兜底结果', async () => {
      mockProvider = {
        name: 'failing-provider',
        chat: vi.fn().mockRejectedValue(new Error('LLM 调用失败')),
      }

      const controller = new CentralControllerImpl(mockProvider)
      const result = await controller.route('打开空调', {
        vehicleState: {} as any,
        dialogHistory: [],
      })

      // 应该返回 chat 域作为兜底
      expect(result.routings).toHaveLength(1)
      expect(result.routings[0].domain).toBe('chat')
      expect(result.overallConfidence).toBeLessThan(0.7)
    })

    it('应该处理无效的 JSON 响应', async () => {
      mockProvider = createMockProvider({
        content: 'This is not valid JSON',
        usage: { promptTokens: 10, completionTokens: 20 },
      })

      const controller = new CentralControllerImpl(mockProvider)
      const result = await controller.route('你好', {
        vehicleState: {} as any,
        dialogHistory: [],
      })

      // 应该返回兜底结果
      expect(result.routings).toHaveLength(1)
      expect(result.routings[0].domain).toBe('chat')
    })

    it('应该包含车辆状态上下文', async () => {
      mockProvider = createMockProvider({
        content: JSON.stringify({
          routings: [
            { domain: 'vehicle_control', rewrittenQuery: '打开空调', confidence: 0.95 },
          ],
          isSequential: false,
          overallConfidence: 0.95,
        }),
        usage: { promptTokens: 10, completionTokens: 20 },
      })

      const controller = new CentralControllerImpl(mockProvider)
      await controller.route('打开空调', {
        vehicleState: {
          ac: { isOn: false, temperature: 26, mode: 'auto', fanSpeed: 2 },
        } as any,
        dialogHistory: [],
      })

      const callArgs = (mockProvider.chat as any).mock.calls[0][0]
      const messages = callArgs.messages

      // 应该包含车辆状态消息
      const stateMessage = messages.find((m: any) =>
        m.content && m.content.includes('车辆状态')
      )
      expect(stateMessage).toBeDefined()
    })

    it('应该包含对话历史上下文', async () => {
      mockProvider = createMockProvider({
        content: JSON.stringify({
          routings: [
            { domain: 'chat', rewrittenQuery: '你好', confidence: 0.95 },
          ],
          isSequential: false,
          overallConfidence: 0.95,
        }),
        usage: { promptTokens: 10, completionTokens: 20 },
      })

      const controller = new CentralControllerImpl(mockProvider)
      await controller.route('你好', {
        vehicleState: {} as any,
        dialogHistory: [
          { role: 'user', content: '你好' },
          { role: 'assistant', content: '你好！有什么可以帮你的？' },
        ],
      })

      const callArgs = (mockProvider.chat as any).mock.calls[0][0]
      const messages = callArgs.messages

      // 应该包含历史消息
      const historyMessage = messages.find((m: any) =>
        m.content && m.content.includes('对话历史')
      )
      expect(historyMessage).toBeDefined()
    })
  })
})
