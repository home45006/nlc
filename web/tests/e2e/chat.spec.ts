import { test, expect } from './fixtures/mockWebSocket'
import { MainPage } from './pages/MainPage'

/**
 * 对话消息测试
 */
test.describe('对话消息功能', () => {
  test('应该能发送消息并显示在列表中', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 发送消息
    await mainPage.chatPanel.inputBar.fillAndSend('打开空调')

    // 验证用户消息显示
    const userMessages = await mainPage.chatPanel.getUserMessages()
    expect(userMessages.length).toBe(1)

    const lastUserMessage = userMessages[userMessages.length - 1]
    await expect(lastUserMessage).toContainText('打开空调')
  })

  test('发送消息后应显示处理中状态', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 发送消息
    await mainPage.chatPanel.inputBar.fillAndSend('打开空调')

    // 等待一小段时间让 processing 消息显示
    await page.waitForTimeout(100)

    // 应该显示处理中状态（loading 动画）
    const processingIndicator = page.locator('.typing-indicator')
    await expect(processingIndicator).toBeVisible()
  })

  test('应该收到助手响应', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 发送消息
    await mainPage.chatPanel.inputBar.fillAndSend('打开空调')

    // 等待响应
    await page.waitForTimeout(500)

    // 验证助手消息显示
    const assistantMessages = await mainPage.chatPanel.getAssistantMessages()
    expect(assistantMessages.length).toBeGreaterThan(0)
  })

  test('空调指令应该触发状态变更', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 发送打开空调指令
    await mainPage.chatPanel.inputBar.fillAndSend('打开空调')

    // 等待响应
    await page.waitForTimeout(500)

    // 验证状态变更标签显示
    const stateChange = page.locator('.bg-green-100, .dark\\:bg-green-900\\/30')
    await expect(stateChange.first()).toBeVisible()

    const changeText = await stateChange.first().textContent()
    expect(changeText).toContain('空调')
  })

  test('温度指令应该调整温度值', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 发送温度调整指令
    await mainPage.chatPanel.inputBar.fillAndSend('把温度调到24度')

    // 等待响应
    await page.waitForTimeout(500)

    // 验证状态变更
    const stateChange = page.locator('.bg-green-100, .dark\\:bg-green-900\\/30')
    await expect(stateChange.first()).toBeVisible()

    const changeText = await stateChange.first().textContent()
    expect(changeText).toContain('温度')
    expect(changeText).toContain('24')
  })

  test('导航指令应该设置目的地', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 发送导航指令
    await mainPage.chatPanel.inputBar.fillAndSend('导航到北京')

    // 等待响应
    await page.waitForTimeout(500)

    // 验证状态变更
    const stateChange = page.locator('.bg-green-100, .dark\\:bg-green-900\\/30')
    await expect(stateChange.first()).toBeVisible()

    const changeText = await stateChange.first().textContent()
    expect(changeText).toContain('北京')
  })

  test('空消息不应发送', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 尝试发送空消息
    await mainPage.chatPanel.inputBar.fill('')
    await mainPage.chatPanel.inputBar.send()

    // 发送按钮应该是禁用状态
    const isDisabled = await mainPage.chatPanel.inputBar.isSendButtonDisabled()
    expect(isDisabled).toBe(true)

    // 不应该有新消息
    const userMessages = await mainPage.chatPanel.getUserMessages()
    expect(userMessages.length).toBe(0)
  })

  test('Enter 键应该发送消息', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 填写消息并按 Enter
    await mainPage.chatPanel.inputBar.fill('测试消息')
    await mainPage.chatPanel.inputBar.pressEnter()

    // 等待消息发送
    await page.waitForTimeout(100)

    // 验证消息已发送
    const userMessages = await mainPage.chatPanel.getUserMessages()
    expect(userMessages.length).toBe(1)
  })

  test('发送消息后输入框应该清空', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 发送消息
    await mainPage.chatPanel.inputBar.fillAndSend('测试消息')

    // 输入框应该清空
    const value = await mainPage.chatPanel.inputBar.getValue()
    expect(value).toBe('')
  })
})
