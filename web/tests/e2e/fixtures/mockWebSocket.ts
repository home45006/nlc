import { test as base, Page } from '@playwright/test'

/**
 * 扩展的测试 fixture，包含 WebSocket Mock 功能
 *
 * 注意：mockWebSocket 必须在页面导航之前调用
 */
type WebSocketMockFixture = {
  /**
   * 模拟 WebSocket 连接
   * 必须在 goto 之前调用
   */
  mockWebSocket: (options?: WebSocketMockOptions) => Promise<void>

  /**
   * 等待 WebSocket 连接
   */
  waitForWsConnection: () => Promise<void>
}

/**
 * WebSocket Mock 配置选项
 */
export interface WebSocketMockOptions {
  vehicleState?: VehicleStateMock
  history?: ChatMessageMock[]
  model?: 'gemini' | 'glm'
  connectionDelay?: number
  simulateError?: boolean
}

/**
 * 车辆状态 Mock
 */
export interface VehicleStateMock {
  ac?: {
    isOn?: boolean
    temperature?: number
    mode?: 'cool' | 'heat' | 'auto' | 'ventilation'
    fanSpeed?: number
  }
  windows?: {
    frontLeft?: number
    frontRight?: number
    rearLeft?: number
    rearRight?: number
  }
  seats?: {
    driverHeating?: number
    driverVentilation?: number
    passengerHeating?: number
    passengerVentilation?: number
  }
  lights?: {
    ambientOn?: boolean
    ambientColor?: string
    readingOn?: boolean
  }
  music?: {
    isPlaying?: boolean
    track?: string
    volume?: number
    mode?: 'sequential' | 'shuffle' | 'repeat_one'
  }
  navigation?: {
    isActive?: boolean
    destination?: string
    routePreference?: 'fastest' | 'shortest' | 'no_highway'
  }
  battery?: {
    level?: number
    rangeKm?: number
  }
}

/**
 * 对话消息 Mock
 */
export interface ChatMessageMock {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 默认车辆状态
 */
const defaultVehicleState = {
  ac: { isOn: false, temperature: 26, mode: 'auto' as const, fanSpeed: 3 },
  windows: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
  seats: { driverHeating: 0, driverVentilation: 0, passengerHeating: 0, passengerVentilation: 0 },
  lights: { ambientOn: false, ambientColor: '#FFFFFF', readingOn: false },
  trunk: { isOpen: false },
  wiper: { isOn: false, speed: 'low' as const },
  music: { isPlaying: false, track: '', volume: 50, mode: 'sequential' as const },
  navigation: { isActive: false, destination: '', routePreference: 'fastest' as const },
  battery: { level: 78, rangeKm: 320 },
}

// 存储当前 mock 状态（在每个测试文件中共享）
let currentOptions: WebSocketMockOptions = {}

/**
 * 扩展 Playwright test with WebSocket mock fixtures
 */
export const test = base.extend<WebSocketMockFixture>({
  mockWebSocket: async ({ page }, use) => {
    const setupMock = async (options: WebSocketMockOptions = {}) => {
      currentOptions = options

      const {
        vehicleState = {},
        history = [],
        model = 'gemini',
        connectionDelay = 0,
        simulateError = false,
      } = options

      // 合并状态
      const mergedState = {
        ...defaultVehicleState,
        ...vehicleState,
        ac: { ...defaultVehicleState.ac, ...vehicleState.ac },
        windows: { ...defaultVehicleState.windows, ...vehicleState.windows },
        seats: { ...defaultVehicleState.seats, ...vehicleState.seats },
        lights: { ...defaultVehicleState.lights, ...vehicleState.lights },
        music: { ...defaultVehicleState.music, ...vehicleState.music },
        navigation: { ...defaultVehicleState.navigation, ...vehicleState.navigation },
        battery: { ...defaultVehicleState.battery, ...vehicleState.battery },
      }

      // 使用 route 来拦截 WebSocket
      await page.route('**/ws', (route) => {
        // WebSocket 路由不能被普通的 route 拦截，这里只是占位
        route.continue()
      })

      // 注入 WebSocket Mock 脚本（必须在导航前调用）
      await page.addInitScript(
        ({ vehicleState, history, model, connectionDelay, simulateError }) => {
          // 存储状态
          ;(window as any).__mockState = { vehicleState, history, model }
          ;(window as any).__wsConnected = false

          // 保存原始 WebSocket
          const OriginalWebSocket = window.WebSocket

          // 创建 Mock WebSocket 类
          const MockWebSocket = function (this: any, url: string, protocols?: string | string[]) {
            const instance = new OriginalWebSocket(url, protocols)

            // 保存实例
            ;(window as any).__wsInstance = instance

            // 模拟连接延迟
            setTimeout(() => {
              if (simulateError) {
                instance.close()
              } else {
                ;(window as any).__wsConnected = true

                // 发送初始化消息
                setTimeout(() => {
                  const initMessage = {
                    type: 'init',
                    payload: {
                      vehicleState: (window as any).__mockState.vehicleState,
                      history: (window as any).__mockState.history,
                      model: (window as any).__mockState.model,
                    },
                  }
                  // 创建并分发消息事件
                  const event = new MessageEvent('message', {
                    data: JSON.stringify(initMessage),
                  })
                  if (instance.onmessage) {
                    instance.onmessage(event)
                  }
                  instance.dispatchEvent(event)
                }, 50)
              }
            }, connectionDelay)

            // 拦截 send 方法
            const originalSend = instance.send.bind(instance)
            instance.send = function (data: string) {
              try {
                const message = JSON.parse(data)

                if (message.type === 'dialog') {
                  // 发送 processing 状态
                  setTimeout(() => {
                    const processingEvent = new MessageEvent('message', {
                      data: JSON.stringify({ type: 'processing' }),
                    })
                    if (instance.onmessage) {
                      instance.onmessage(processingEvent)
                    }
                    instance.dispatchEvent(processingEvent)
                  }, 50)

                  // 发送响应
                  setTimeout(() => {
                    const response = generateResponse(
                      message.payload?.message,
                      (window as any).__mockState.vehicleState,
                      (window as any).__mockState.model
                    )
                    const responseEvent = new MessageEvent('message', {
                      data: JSON.stringify(response),
                    })
                    if (instance.onmessage) {
                      instance.onmessage(responseEvent)
                    }
                    instance.dispatchEvent(responseEvent)
                  }, 200)
                } else if (message.type === 'ping') {
                  // 响应心跳
                  setTimeout(() => {
                    const pongEvent = new MessageEvent('message', {
                      data: JSON.stringify({ type: 'pong' }),
                    })
                    if (instance.onmessage) {
                      instance.onmessage(pongEvent)
                    }
                    instance.dispatchEvent(pongEvent)
                  }, 10)
                } else {
                  // 其他消息正常发送
                  originalSend(data)
                }
              } catch (e) {
                originalSend(data)
              }
            }

            return instance
          }

          // 复制静态属性
          MockWebSocket.CONNECTING = OriginalWebSocket.CONNECTING
          MockWebSocket.OPEN = OriginalWebSocket.OPEN
          MockWebSocket.CLOSING = OriginalWebSocket.CLOSING
          MockWebSocket.CLOSED = OriginalWebSocket.CLOSED

          // 替换 WebSocket
          ;(window as any).WebSocket = MockWebSocket

          // 响应生成函数
          function generateResponse(
            userMessage: string,
            currentState: any,
            model: string
          ): any {
            const lowerMessage = (userMessage || '').toLowerCase()
            let ttsText = '好的，我已经收到您的指令。'
            const stateChanges: any[] = []

            if (lowerMessage.includes('空调') || lowerMessage.includes('温度')) {
              if (lowerMessage.includes('打开') || lowerMessage.includes('开启')) {
                stateChanges.push({ field: '空调状态', from: '关闭', to: '开启' })
                currentState.ac.isOn = true
              }
              if (lowerMessage.includes('关闭')) {
                stateChanges.push({ field: '空调状态', from: '开启', to: '关闭' })
                currentState.ac.isOn = false
              }
              const tempMatch = lowerMessage.match(/(\d+)\s*度/)
              if (tempMatch) {
                const temp = parseInt(tempMatch[1], 10)
                stateChanges.push({
                  field: '空调温度',
                  from: currentState.ac.temperature + '\u00B0C',
                  to: temp + '\u00B0C',
                })
                currentState.ac.temperature = temp
              }
              if (stateChanges.length > 0) {
                ttsText = '好的，已为您调整空调设置。'
              }
            }

            if (lowerMessage.includes('车窗')) {
              if (lowerMessage.includes('打开') || lowerMessage.includes('降下')) {
                stateChanges.push({ field: '前左车窗', from: '0%', to: '100%' })
                currentState.windows.frontLeft = 100
                ttsText = '好的，已为您打开车窗。'
              }
              if (lowerMessage.includes('关闭') || lowerMessage.includes('升起')) {
                stateChanges.push({ field: '前左车窗', from: '100%', to: '0%' })
                currentState.windows.frontLeft = 0
                ttsText = '好的，已为您关闭车窗。'
              }
            }

            if (
              lowerMessage.includes('导航') ||
              lowerMessage.includes('去') ||
              lowerMessage.includes('到')
            ) {
              const destMatch = lowerMessage.match(/(?:导航\u5230?|去|\u5230)\s*(.+)/)
              if (destMatch) {
                const destination = destMatch[1].trim()
                stateChanges.push({
                  field: '导航目的地',
                  from: currentState.navigation.destination || '\u65E0',
                  to: destination,
                })
                currentState.navigation.destination = destination
                currentState.navigation.isActive = true
                ttsText = '\u597D\u7684\uFF0C\u5DF2\u4E3A\u60A8\u89C4\u5212\u524D\u5F80' + destination + '\u7684\u8DEF\u7EBF\u3002'
              }
            }

            if (lowerMessage.includes('音乐') || lowerMessage.includes('播放')) {
              if (lowerMessage.includes('播放')) {
                const trackMatch = lowerMessage.match(/播放\s*(.+)/)
                if (trackMatch) {
                  const track = trackMatch[1].trim()
                  stateChanges.push({
                    field: '音乐曲目',
                    from: currentState.music.track || '\u65E0',
                    to: track,
                  })
                  currentState.music.track = track
                  currentState.music.isPlaying = true
                  ttsText = '\u597D\u7684\uFF0C\u6B63\u5728\u4E3A\u60A8\u64AD\u653E' + track + '\u3002'
                }
              }
            }

            return {
              type: 'dialog',
              payload: {
                ttsText,
                stateChanges,
                meta: {
                  model,
                  latencyMs: 150,
                  tokens: { prompt: 100, completion: 50 },
                },
              },
            }
          }
        },
        {
          vehicleState: mergedState,
          history,
          model,
          connectionDelay,
          simulateError,
        }
      )
    }

    await use(setupMock)
  },

  waitForWsConnection: async ({ page }, use) => {
    const waitForConnection = async () => {
      await page.waitForFunction(
        () => (window as any).__wsConnected === true,
        { timeout: 10000 }
      )
    }

    await use(waitForConnection)
  },
})

export { expect } from '@playwright/test'
