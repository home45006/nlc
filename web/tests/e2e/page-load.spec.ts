import { test, expect } from './fixtures/mockWebSocket'
import { MainPage } from './pages/MainPage'

/**
 * 页面加载与 WebSocket 连接测试
 */
test.describe('页面加载与连接', () => {
  test('页面应该正确加载并显示标题', async ({ page }) => {
    const mainPage = new MainPage(page)
    await mainPage.goto()

    // 验证标题
    await expect(mainPage.title).toContainText('智能座舱控制系统')
    await expect(mainPage.logo).toBeVisible()
  })

  test('应该显示欢迎消息和示例指令', async ({ page, mockWebSocket }) => {
    // 设置 WebSocket Mock（必须在 goto 之前）
    await mockWebSocket({ history: [] })

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证欢迎消息
    await expect(mainPage.chatPanel.welcomeMessage).toBeVisible()

    // 验证示例指令
    const examples = await mainPage.chatPanel.getExampleCommands()
    expect(examples.length).toBeGreaterThan(0)
  })

  test('WebSocket 连接成功后应隐藏连接状态提示', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 连接状态提示应该隐藏
    const statusVisible = await mainPage.chatPanel.connectionStatus.isVisible()
    expect(statusVisible).toBe(false)
  })

  test('WebSocket 连接失败应显示错误提示', async ({ page, mockWebSocket }) => {
    await mockWebSocket({ simulateError: true })

    const mainPage = new MainPage(page)
    await mainPage.goto()

    // 应该显示连接状态（错误或连接中）
    await expect(mainPage.chatPanel.connectionStatus).toBeVisible()
  })

  test('初始车辆状态应该正确显示', async ({ page, mockWebSocket }) => {
    const customState = {
      vehicleState: {
        ac: { isOn: true, temperature: 24, mode: 'cool' as const, fanSpeed: 2 },
        battery: { level: 85, rangeKm: 380 },
        music: { isPlaying: true, track: '测试歌曲', volume: 60, mode: 'sequential' as const },
      },
    }

    await mockWebSocket(customState)

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证空调状态
    const acOn = await mainPage.vehicleOverview.acControl.isOn()
    expect(acOn).toBe(true)

    const temp = await mainPage.vehicleOverview.acControl.getTemperature()
    expect(temp).toBe(24)

    // 验证电量
    const batteryLevel = await mainPage.vehicleOverview.batteryIndicator.getLevel()
    expect(batteryLevel).toBe(85)

    const range = await mainPage.vehicleOverview.batteryIndicator.getRange()
    expect(range).toBe(380)

    // 验证音乐状态
    const isPlaying = await mainPage.vehicleOverview.musicControl.isPlaying()
    expect(isPlaying).toBe(true)
  })

  test('历史消息应该正确恢复', async ({ page, mockWebSocket }) => {
    const history = [
      { role: 'user' as const, content: '打开空调' },
      { role: 'assistant' as const, content: '好的，已为您打开空调。' },
      { role: 'user' as const, content: '把温度调到24度' },
      { role: 'assistant' as const, content: '好的，已将温度调整到24度。' },
    ]

    await mockWebSocket({ history })

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 欢迎消息应该隐藏（因为有历史记录）
    const hasWelcome = await mainPage.chatPanel.hasWelcomeMessage()
    expect(hasWelcome).toBe(false)

    // 应该显示历史消息（2条用户消息）
    const userMessages = await mainPage.chatPanel.getUserMessages()
    expect(userMessages.length).toBe(2)
  })
})
