import { test, expect } from './fixtures/mockWebSocket'
import { MainPage } from './pages/MainPage'

/**
 * Header 控制功能测试
 */
test.describe('Header 控制功能', () => {
  test('应该显示模型选择器', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 模型选择器应该可见
    await expect(mainPage.modelSelector).toBeVisible()

    // 默认应该显示 Gemini
    await expect(mainPage.modelSelector).toContainText('Gemini')
  })

  test('点击模型选择器应该显示下拉菜单', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 打开模型选择器
    await mainPage.openModelSelector()

    // 菜单应该显示
    await expect(mainPage.modelMenu).toBeVisible()

    // 应该有两个选项
    await expect(mainPage.modelMenu.locator('button:has-text("Gemini")')).toBeVisible()
    await expect(mainPage.modelMenu.locator('button:has-text("GLM")')).toBeVisible()
  })

  test('重置按钮应该显示确认对话框', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 设置 dialog 监听并取消
    let dialogShown = false
    page.on('dialog', (dialog) => {
      dialogShown = true
      dialog.dismiss()
    })

    // 点击重置
    await mainPage.resetButton.click()

    // 应该显示 dialog
    expect(dialogShown).toBe(true)
  })
})

test.describe('Header 布局', () => {
  test('Header 应该包含所有控制元素', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // Logo
    await expect(mainPage.logo).toBeVisible()

    // 标题
    await expect(mainPage.title).toBeVisible()

    // 模型选择器
    await expect(mainPage.modelSelector).toBeVisible()

    // 重置按钮
    await expect(mainPage.resetButton).toBeVisible()

    // 暗色模式按钮
    await expect(mainPage.darkModeToggle).toBeVisible()
  })

  test('Header 应该有边框', async ({ page, mockWebSocket }) => {
    await mockWebSocket({})

    const mainPage = new MainPage(page)
    await mainPage.goto()
    await mainPage.chatPanel.waitForConnection()

    // 验证 header 有底部边框
    const borderBottom = await mainPage.header.evaluate((el) => {
      return window.getComputedStyle(el).borderBottomWidth
    })

    expect(parseFloat(borderBottom)).toBeGreaterThan(0)
  })
})
