import { test, expect } from './fixtures/mockWebSocket'
import { MainPage } from './pages/MainPage'

/**
 * 移动端响应式布局测试
 */

// 移动端测试 - Pixel 5 (只使用 viewport)
test.describe('移动端响应式布局 - Pixel 5', () => {
  test.use({ viewport: { width: 393, height: 851 } })

  test('移动端应该显示标题', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    await expect(mainPage.title).toBeVisible()
  })

  test('移动端应该垂直排列内容', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 获取主内容区的布局方向
    const mainContent = page.locator('main')
    const flexDirection = await mainContent.evaluate((el) => {
      return window.getComputedStyle(el).flexDirection
    })

    // 移动端应该是 column
    expect(flexDirection).toBe('column')
  })

  test('移动端对话面板应该在上方', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 获取两个区域的位置
    const chatBox = await page.locator('section').boundingBox()
    const vehicleBox = await page.locator('aside').boundingBox()

    // 对话面板的 Y 坐标应该小于车辆状态区域（在上边）
    expect(chatBox?.y).toBeLessThan(vehicleBox?.y || 0)
  })

  test('移动端输入框应该正常显示', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 输入框应该可见
    await expect(mainPage.chatPanel.inputBar.textarea).toBeVisible()

    // 发送按钮应该可见
    await expect(mainPage.chatPanel.inputBar.sendButton).toBeVisible()
  })
})

// 平板端测试
test.describe('平板端响应式布局', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('平板端应该水平排列内容', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 获取主内容区的布局方向
    const mainContent = page.locator('main')
    const flexDirection = await mainContent.evaluate((el) => {
      return window.getComputedStyle(el).flexDirection
    })

    // 平板端应该是 row（md:flex-row）
    expect(flexDirection).toBe('row')
  })

  test('平板端对话面板应该在右侧', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 获取两个区域的位置
    const chatBox = await page.locator('section').boundingBox()
    const vehicleBox = await page.locator('aside').boundingBox()

    // 对话面板的 X 坐标应该大于车辆状态区域（在右边）
    expect(chatBox?.x).toBeGreaterThan(vehicleBox?.x || 0)
  })
})

// 大屏幕测试
test.describe('大屏幕适配', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('大屏幕应该正常显示', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 标题应该可见
    await expect(mainPage.title).toBeVisible()

    // 两侧内容应该水平排列
    const mainContent = page.locator('main')
    const flexDirection = await mainContent.evaluate((el) => {
      return window.getComputedStyle(el).flexDirection
    })
    expect(flexDirection).toBe('row')
  })

  test('大屏幕应该有最大宽度限制', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 获取主内容区的宽度
    const mainContent = page.locator('main')
    const width = await mainContent.evaluate((el) => {
      return el.getBoundingClientRect().width
    })

    // max-w-7xl = 80rem = 1280px
    expect(width).toBeLessThanOrEqual(1280)
  })
})
