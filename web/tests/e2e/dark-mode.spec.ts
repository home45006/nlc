import { test, expect } from './fixtures/mockWebSocket'
import { MainPage } from './pages/MainPage'

/**
 * 暗色模式测试
 */
test.describe('暗色模式', () => {
  test('应该有暗色模式切换按钮', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证切换按钮存在
    await expect(mainPage.darkModeToggle).toBeVisible()
  })

  test('点击切换按钮应该切换到暗色模式', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 初始应该是亮色模式
    const initialIsDark = await mainPage.isDarkMode()
    expect(initialIsDark).toBe(false)

    // 点击切换
    await mainPage.toggleDarkMode()

    // 应该切换到暗色模式
    const isDark = await mainPage.isDarkMode()
    expect(isDark).toBe(true)

    // html 元素应该有 dark class
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('再次点击应该切换回亮色模式', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 切换到暗色
    await mainPage.toggleDarkMode()
    expect(await mainPage.isDarkMode()).toBe(true)

    // 再切换回亮色
    await mainPage.toggleDarkMode()
    expect(await mainPage.isDarkMode()).toBe(false)
  })

  test('暗色模式偏好应该保存到 localStorage', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 切换到暗色模式
    await mainPage.toggleDarkMode()

    // 验证 localStorage
    const darkMode = await page.evaluate(() => localStorage.getItem('darkMode'))
    expect(darkMode).toBe('true')

    // 切换回亮色
    await mainPage.toggleDarkMode()

    const darkModeAfter = await page.evaluate(() => localStorage.getItem('darkMode'))
    expect(darkModeAfter).toBe('false')
  })

  test('刷新页面应该恢复暗色模式设置', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 切换到暗色模式
    await mainPage.toggleDarkMode()
    expect(await mainPage.isDarkMode()).toBe(true)

    // 刷新页面
    await page.reload()
    await mockWebSocket({})
    await mainPage.chatPanel.waitForConnection()

    // 暗色模式应该保持
    expect(await mainPage.isDarkMode()).toBe(true)
  })
})
