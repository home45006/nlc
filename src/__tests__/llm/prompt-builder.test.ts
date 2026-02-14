import { describe, it, expect, beforeEach } from 'vitest'
import { PromptBuilder } from '../../llm/prompt-builder.js'
import { createDefaultVehicleState } from '../../types/index.js'
import type { ChatMessage, VehicleState } from '../../types/index.js'

describe('PromptBuilder', () => {
  let builder: PromptBuilder

  beforeEach(() => {
    builder = new PromptBuilder()
  })

  describe('buildMessages', () => {
    it('应该构建包含系统消息的消息列表', () => {
      const userInput = '打开空调'
      const vehicleState = createDefaultVehicleState()
      const history: ChatMessage[] = []

      const messages = builder.buildMessages(userInput, history, vehicleState)

      expect(messages.length).toBe(2)
      expect(messages[0].role).toBe('system')
      expect(messages[0].content).toContain('小智')
    })

    it('应该在系统消息中包含车辆状态', () => {
      const userInput = '测试'
      const vehicleState = createDefaultVehicleState()
      const history: ChatMessage[] = []

      const messages = builder.buildMessages(userInput, history, vehicleState)
      const systemContent = messages[0].content

      expect(systemContent).toContain('空调')
      expect(systemContent).toContain('26°C')
      expect(systemContent).toContain('车窗')
      expect(systemContent).toContain('音乐')
      expect(systemContent).toContain('导航')
      expect(systemContent).toContain('电池')
    })

    it('应该在消息末尾添加用户输入', () => {
      const userInput = '把空调调到24度'
      const vehicleState = createDefaultVehicleState()
      const history: ChatMessage[] = []

      const messages = builder.buildMessages(userInput, history, vehicleState)

      const lastMessage = messages[messages.length - 1]
      expect(lastMessage.role).toBe('user')
      expect(lastMessage.content).toBe(userInput)
    })

    it('应该包含历史消息', () => {
      const userInput = '再高一点'
      const vehicleState = createDefaultVehicleState()
      const history: ChatMessage[] = [
        { role: 'user', content: '把空调调到24度' },
        { role: 'assistant', content: '好的，已为您将空调调至24度。' },
      ]

      const messages = builder.buildMessages(userInput, history, vehicleState)

      expect(messages.length).toBe(4) // system + 2 history + current user
      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toBe('把空调调到24度')
      expect(messages[2].role).toBe('assistant')
      expect(messages[2].content).toBe('好的，已为您将空调调至24度。')
    })

    it('应该正确格式化空调状态', () => {
      const userInput = '测试'
      const vehicleState: VehicleState = {
        ...createDefaultVehicleState(),
        ac: {
          isOn: true,
          temperature: 24,
          mode: 'cool',
          fanSpeed: 5,
        },
      }

      const messages = builder.buildMessages(userInput, [], vehicleState)
      const systemContent = messages[0].content

      expect(systemContent).toContain('已开启')
      expect(systemContent).toContain('24°C')
      expect(systemContent).toContain('制冷')
      expect(systemContent).toContain('风速5')
    })

    it('应该正确格式化车窗状态', () => {
      const userInput = '测试'
      const vehicleState: VehicleState = {
        ...createDefaultVehicleState(),
        windows: {
          frontLeft: 100,
          frontRight: 50,
          rearLeft: 0,
          rearRight: 0,
        },
      }

      const messages = builder.buildMessages(userInput, [], vehicleState)
      const systemContent = messages[0].content

      expect(systemContent).toContain('主驾全开')
      expect(systemContent).toContain('副驾开启50%')
      expect(systemContent).toContain('左后关闭')
    })

    it('应该正确格式化座椅状态', () => {
      const userInput = '测试'
      const vehicleState: VehicleState = {
        ...createDefaultVehicleState(),
        seats: {
          driverHeating: 2,
          driverVentilation: 1,
          passengerHeating: 0,
          passengerVentilation: 0,
        },
      }

      const messages = builder.buildMessages(userInput, [], vehicleState)
      const systemContent = messages[0].content

      expect(systemContent).toContain('主驾加热2挡')
      expect(systemContent).toContain('主驾通风1挡')
      expect(systemContent).toContain('副驾加热关闭')
    })

    it('应该正确格式化音乐状态', () => {
      const userInput = '测试'
      const vehicleState: VehicleState = {
        ...createDefaultVehicleState(),
        music: {
          isPlaying: true,
          track: '晴天',
          volume: 70,
          mode: 'shuffle',
        },
      }

      const messages = builder.buildMessages(userInput, [], vehicleState)
      const systemContent = messages[0].content

      expect(systemContent).toContain('播放中')
      expect(systemContent).toContain('晴天')
      expect(systemContent).toContain('音量70%')
      expect(systemContent).toContain('随机播放')
    })

    it('应该正确格式化导航状态', () => {
      const userInput = '测试'
      const vehicleState: VehicleState = {
        ...createDefaultVehicleState(),
        navigation: {
          isActive: true,
          destination: '天安门',
          routePreference: 'fastest',
        },
      }

      const messages = builder.buildMessages(userInput, [], vehicleState)
      const systemContent = messages[0].content

      expect(systemContent).toContain('导航中')
      expect(systemContent).toContain('天安门')
      expect(systemContent).toContain('最快')
    })

    it('应该正确格式化电池状态', () => {
      const userInput = '测试'
      const vehicleState: VehicleState = {
        ...createDefaultVehicleState(),
        battery: {
          level: 65,
          rangeKm: 250,
        },
      }

      const messages = builder.buildMessages(userInput, [], vehicleState)
      const systemContent = messages[0].content

      expect(systemContent).toContain('65%')
      expect(systemContent).toContain('250km')
    })

    it('应该保持消息顺序: system -> history -> user', () => {
      const userInput = '当前状态'
      const vehicleState = createDefaultVehicleState()
      const history: ChatMessage[] = [
        { role: 'user', content: '历史1' },
        { role: 'assistant', content: '回复1' },
        { role: 'user', content: '历史2' },
        { role: 'assistant', content: '回复2' },
      ]

      const messages = builder.buildMessages(userInput, history, vehicleState)

      expect(messages[0].role).toBe('system')
      expect(messages[1].content).toBe('历史1')
      expect(messages[2].content).toBe('回复1')
      expect(messages[3].content).toBe('历史2')
      expect(messages[4].content).toBe('回复2')
      expect(messages[5].content).toBe('当前状态')
      expect(messages[5].role).toBe('user')
    })

    it('应该替换车辆状态占位符', () => {
      const userInput = '测试'
      const vehicleState = createDefaultVehicleState()

      const messages = builder.buildMessages(userInput, [], vehicleState)
      const systemContent = messages[0].content

      // 占位符应该被替换
      expect(systemContent).not.toContain('{{vehicle_state}}')
      // 应该包含实际的车辆状态信息
      expect(systemContent).toContain('当前车辆状态')
    })
  })
})
