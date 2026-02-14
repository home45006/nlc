import { test, expect } from './fixtures/mockWebSocket'
import { MainPage } from './pages/MainPage'

/**
 * 车辆状态显示测试
 */
test.describe('车辆状态显示', () => {
  test('应该显示所有车辆控制组件', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证所有组件可见
    expect(await mainPage.vehicleOverview.acControl.container.isVisible()).toBe(true)
    expect(await mainPage.vehicleOverview.batteryIndicator.container.isVisible()).toBe(true)
    expect(await mainPage.vehicleOverview.seatControl.isVisible()).toBe(true)
    expect(await mainPage.vehicleOverview.lightControl.isVisible()).toBe(true)
    expect(await mainPage.vehicleOverview.musicControl.container.isVisible()).toBe(true)
    expect(await mainPage.vehicleOverview.navigationControl.container.isVisible()).toBe(true)
  })

  test('空调控制应该正确显示初始状态', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证默认状态
    const isOn = await mainPage.vehicleOverview.acControl.isOn()
    expect(isOn).toBe(false)

    const temp = await mainPage.vehicleOverview.acControl.getTemperature()
    expect(temp).toBe(26)

    const mode = await mainPage.vehicleOverview.acControl.getMode()
    expect(mode).toBe('自动')

    const fanSpeed = await mainPage.vehicleOverview.acControl.getFanSpeed()
    expect(fanSpeed).toBe(3)
  })

  test('电量指示器应该正确显示', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    const level = await mainPage.vehicleOverview.batteryIndicator.getLevel()
    expect(level).toBe(78)

    const range = await mainPage.vehicleOverview.batteryIndicator.getRange()
    expect(range).toBe(320)
  })

  test('音乐控制应该正确显示初始状态', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    const isPlaying = await mainPage.vehicleOverview.musicControl.isPlaying()
    expect(isPlaying).toBe(false)

    const volume = await mainPage.vehicleOverview.musicControl.getVolume()
    expect(volume).toBe(50)
  })

  test('导航控制应该正确显示初始状态', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    const isActive = await mainPage.vehicleOverview.navigationControl.isActive()
    expect(isActive).toBe(false)
  })

  test('车辆俯视图应该显示', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证 SVG 可见
    await expect(mainPage.vehicleOverview.vehicleSvg).toBeVisible()
  })
})

test.describe('车辆状态实时更新', () => {
  test('自定义初始状态应该正确显示', async ({ page, mockWebSocket }) => {
    const customState = {
      vehicleState: {
        ac: { isOn: true, temperature: 22, mode: 'cool' as const, fanSpeed: 4 },
        battery: { level: 50, rangeKm: 200 },
        music: { isPlaying: true, track: '晴天', volume: 70, mode: 'shuffle' as const },
        navigation: { isActive: true, destination: '上海', routePreference: 'fastest' as const },
      },
    }

    await mockWebSocket(customState)

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证空调
    const acOn = await mainPage.vehicleOverview.acControl.isOn()
    expect(acOn).toBe(true)

    const acTemp = await mainPage.vehicleOverview.acControl.getTemperature()
    expect(acTemp).toBe(22)

    const acMode = await mainPage.vehicleOverview.acControl.getMode()
    expect(acMode).toBe('制冷')

    const fanSpeed = await mainPage.vehicleOverview.acControl.getFanSpeed()
    expect(fanSpeed).toBe(4)

    // 验证电量
    const batteryLevel = await mainPage.vehicleOverview.batteryIndicator.getLevel()
    expect(batteryLevel).toBe(50)

    // 验证音乐
    const isPlaying = await mainPage.vehicleOverview.musicControl.isPlaying()
    expect(isPlaying).toBe(true)

    const volume = await mainPage.vehicleOverview.musicControl.getVolume()
    expect(volume).toBe(70)

    // 验证导航
    const isActive = await mainPage.vehicleOverview.navigationControl.isActive()
    expect(isActive).toBe(true)

    const destination = await mainPage.vehicleOverview.navigationControl.getDestination()
    expect(destination).toBe('上海')
  })

  test('低电量应该显示警告样式', async ({ page, mockWebSocket }) => {
    const lowBatteryState = {
      vehicleState: {
        battery: { level: 20, rangeKm: 80 },
      },
    }

    await mockWebSocket(lowBatteryState)

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证电量显示
    const level = await mainPage.vehicleOverview.batteryIndicator.getLevel()
    expect(level).toBe(20)

    // 验证状态标签显示"低电量"
    const statusText = await mainPage.vehicleOverview.batteryIndicator.container
      .locator('.text-xs.px-2.py-1')
      .textContent()
    expect(statusText).toContain('低电量')
  })
})
