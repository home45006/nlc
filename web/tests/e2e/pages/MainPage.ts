import { Page, Locator, expect } from '@playwright/test'

/**
 * 主页面 Page Object
 * 智能座舱控制系统主界面
 */
export class MainPage {
  readonly page: Page
  readonly header: Locator
  readonly logo: Locator
  readonly title: Locator
  readonly darkModeToggle: Locator
  readonly resetButton: Locator
  readonly modelSelector: Locator
  readonly modelMenu: Locator
  readonly chatPanel: ChatPanel
  readonly vehicleOverview: VehicleOverview

  constructor(page: Page) {
    this.page = page
    this.header = page.locator('header')
    this.logo = page.locator('header .w-8.h-8.bg-blue-500')
    this.title = page.locator('header h1')
    this.darkModeToggle = page.locator('header button[title="切换主题"]')
    this.resetButton = page.locator('header button[title="重置"]')
    this.modelSelector = page.locator('header button:has-text("Gemini"), header button:has-text("GLM")')
    this.modelMenu = page.locator('.absolute.right-0.mt-2.w-40')
    this.chatPanel = new ChatPanel(page)
    this.vehicleOverview = new VehicleOverview(page)
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async toggleDarkMode() {
    await this.darkModeToggle.click()
  }

  async isDarkMode(): Promise<boolean> {
    return await this.page.locator('html').hasClass('dark')
  }

  async openModelSelector() {
    await this.modelSelector.click()
    await this.modelMenu.waitFor({ state: 'visible' })
  }

  async selectModel(model: 'gemini' | 'glm') {
    await this.openModelSelector()
    const modelText = model === 'gemini' ? 'Gemini' : 'GLM'
    await this.modelMenu.locator(`button:has-text("${modelText}")`).click()
    await this.modelMenu.waitFor({ state: 'hidden' })
  }

  async confirmReset() {
    // 监听 dialog 并确认
    this.page.once('dialog', (dialog) => dialog.accept())
    await this.resetButton.click()
  }

  async cancelReset() {
    // 监听 dialog 并取消
    this.page.once('dialog', (dialog) => dialog.dismiss())
    await this.resetButton.click()
  }
}

/**
 * 对话面板 Page Object
 */
export class ChatPanel {
  readonly page: Page
  readonly container: Locator
  readonly connectionStatus: Locator
  readonly messageList: Locator
  readonly inputBar: InputBar
  readonly welcomeMessage: Locator
  readonly exampleCommands: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('section').filter({ hasText: '输入指令' })
    this.connectionStatus = page.locator('.bg-yellow-50, .bg-red-50').first()
    this.messageList = page.locator('.flex-1.overflow-y-auto')
    this.inputBar = new InputBar(page)
    this.welcomeMessage = page.locator('text=欢迎使用智能座舱控制系统')
    this.exampleCommands = page.locator('.flex.flex-wrap.justify-center.gap-2 span')
  }

  async isConnected(): Promise<boolean> {
    // 检查是否显示连接状态提示（黄色表示连接中，红色表示错误）
    const statusVisible = await this.connectionStatus.isVisible()
    if (!statusVisible) return true

    const text = await this.connectionStatus.textContent()
    return !text?.includes('正在连接') && !text?.includes('错误')
  }

  async waitForConnection(timeout = 10000) {
    await this.page.waitForFunction(
      () => {
        const status = document.querySelector('.bg-yellow-50, .bg-red-50')
        if (!status) return true
        const text = status.textContent || ''
        return !text.includes('正在连接')
      },
      { timeout }
    )
  }

  async getMessageCount(): Promise<number> {
    return await this.page.locator('[class*="message"]').count()
  }

  async getUserMessages(): Promise<Locator[]> {
    const messages = await this.page.locator('.bg-blue-500.text-white').all()
    return messages
  }

  async getAssistantMessages(): Promise<Locator[]> {
    const messages = await this.page.locator('.bg-gray-100.dark\\:bg-gray-700').all()
    return messages
  }

  async getLastMessage(): Promise<Locator> {
    return this.page.locator('[class*="message"]').last()
  }

  async hasWelcomeMessage(): Promise<boolean> {
    return await this.welcomeMessage.isVisible()
  }

  async getExampleCommands(): Promise<string[]> {
    const commands = await this.exampleCommands.allTextContents()
    return commands.map((c) => c.trim())
  }
}

/**
 * 输入栏 Page Object
 */
export class InputBar {
  readonly page: Page
  readonly container: Locator
  readonly textarea: Locator
  readonly sendButton: Locator
  readonly hint: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.border-t.border-gray-200').filter({ has: page.locator('textarea') })
    this.textarea = page.locator('textarea[placeholder="输入指令或问题..."]')
    this.sendButton = page.locator('button:has(svg[class*="M12 19l9 2"])')
    this.hint = page.locator('text=按 Enter 发送')
  }

  async fill(text: string) {
    await this.textarea.fill(text)
  }

  async send() {
    await this.sendButton.click()
  }

  async fillAndSend(text: string) {
    await this.fill(text)
    await this.send()
  }

  async pressEnter() {
    await this.textarea.press('Enter')
  }

  async pressShiftEnter() {
    await this.textarea.press('Shift+Enter')
  }

  async isDisabled(): Promise<boolean> {
    return (await this.textarea.getAttribute('disabled')) !== null
  }

  async isSendButtonDisabled(): Promise<boolean> {
    return (await this.sendButton.getAttribute('disabled')) !== null
  }

  async getValue(): Promise<string> {
    return (await this.textarea.inputValue()) || ''
  }

  async clear() {
    await this.textarea.clear()
  }
}

/**
 * 车辆概览 Page Object
 */
export class VehicleOverview {
  readonly page: Page
  readonly container: Locator
  readonly vehicleSvg: Locator
  readonly batteryIndicator: BatteryIndicator
  readonly acControl: ACControl
  readonly windowControl: WindowControl
  readonly seatControl: SeatControl
  readonly lightControl: LightControl
  readonly musicControl: MusicControl
  readonly navigationControl: NavigationControl

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('aside').filter({ has: page.locator('text=车辆状态') })
    this.vehicleSvg = page.locator('.vehicle-svg')
    this.batteryIndicator = new BatteryIndicator(page)
    this.acControl = new ACControl(page)
    this.windowControl = new WindowControl(page)
    this.seatControl = new SeatControl(page)
    this.lightControl = new LightControl(page)
    this.musicControl = new MusicControl(page)
    this.navigationControl = new NavigationControl(page)
  }

  async isVisible(): Promise<boolean> {
    return await this.container.isVisible()
  }
}

/**
 * 电量指示器 Page Object
 */
export class BatteryIndicator {
  readonly page: Page
  readonly container: Locator
  readonly level: Locator
  readonly range: Locator
  readonly progressBar: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.bg-white, .dark\\:bg-gray-800').filter({ has: page.locator('text=电量') })
    this.level = this.container.locator('text=/\\d+%/')
    this.range = this.container.locator('text=/\\d+ km/')
    this.progressBar = this.container.locator('.h-4.bg-gray-200 > div')
  }

  async getLevel(): Promise<number> {
    const text = await this.level.textContent()
    return parseInt(text?.replace('%', '') || '0', 10)
  }

  async getRange(): Promise<number> {
    const text = await this.range.textContent()
    return parseInt(text?.replace(' km', '') || '0', 10)
  }

  async getProgressWidth(): Promise<string> {
    return (await this.progressBar.getAttribute('style')) || ''
  }
}

/**
 * 空调控制 Page Object
 */
export class ACControl {
  readonly page: Page
  readonly container: Locator
  readonly status: Locator
  readonly temperature: Locator
  readonly mode: Locator
  readonly fanSpeed: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.bg-white, .dark\\:bg-gray-800').filter({ has: page.locator('text=空调') })
    this.status = this.container.locator('.text-xs.px-2.py-1')
    this.temperature = this.container.locator('text=/\\d+°C/')
    this.mode = this.container.getByText('模式').locator('..').locator('span.font-medium')
    this.fanSpeed = this.container.getByText('风速').locator('..').locator('span.font-medium')
  }

  async getStatus(): Promise<string> {
    return (await this.status.textContent())?.trim() || ''
  }

  async getTemperature(): Promise<number> {
    const text = await this.temperature.textContent()
    return parseInt(text?.replace('°C', '') || '0', 10)
  }

  async getMode(): Promise<string> {
    return (await this.mode.textContent())?.trim() || ''
  }

  async getFanSpeed(): Promise<number> {
    const text = await this.fanSpeed.textContent()
    return parseInt(text?.replace(' 档', '') || '0', 10)
  }

  async isOn(): Promise<boolean> {
    const status = await this.getStatus()
    return status === '开启'
  }
}

/**
 * 车窗控制 Page Object
 */
export class WindowControl {
  readonly page: Page
  readonly container: Locator
  readonly frontLeft: Locator
  readonly frontRight: Locator
  readonly rearLeft: Locator
  readonly rearRight: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.bg-white, .dark\\:bg-gray-800').filter({ has: page.locator('text=车窗') })
    // 从 VehicleOverview 中的位置标注获取值
    this.frontLeft = page.locator('.absolute.top-8.left-12')
    this.frontRight = page.locator('.absolute.top-8.right-12')
    this.rearLeft = page.locator('.absolute.bottom-8.left-12')
    this.rearRight = page.locator('.absolute.bottom-8.right-12')
  }

  async getFrontLeft(): Promise<number> {
    const text = await this.frontLeft.textContent()
    return parseInt(text?.replace('%', '') || '0', 10)
  }

  async getFrontRight(): Promise<number> {
    const text = await this.frontRight.textContent()
    return parseInt(text?.replace('%', '') || '0', 10)
  }

  async getRearLeft(): Promise<number> {
    const text = await this.rearLeft.textContent()
    return parseInt(text?.replace('%', '') || '0', 10)
  }

  async getRearRight(): Promise<number> {
    const text = await this.rearRight.textContent()
    return parseInt(text?.replace('%', '') || '0', 10)
  }
}

/**
 * 座椅控制 Page Object
 */
export class SeatControl {
  readonly page: Page
  readonly container: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.bg-white, .dark\\:bg-gray-800').filter({ has: page.locator('text=座椅') })
  }

  async isVisible(): Promise<boolean> {
    return await this.container.isVisible()
  }
}

/**
 * 灯光控制 Page Object
 */
export class LightControl {
  readonly page: Page
  readonly container: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.bg-white, .dark\\:bg-gray-800').filter({ has: page.locator('text=灯光') })
  }

  async isVisible(): Promise<boolean> {
    return await this.container.isVisible()
  }
}

/**
 * 音乐控制 Page Object
 */
export class MusicControl {
  readonly page: Page
  readonly container: Locator
  readonly status: Locator
  readonly track: Locator
  readonly volume: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.bg-white, .dark\\:bg-gray-800').filter({ has: page.locator('text=音乐') })
    this.status = this.container.locator('.text-xs.px-2.py-1')
    this.track = this.container.getByText('曲目').locator('..').locator('span.font-medium')
    this.volume = this.container.getByText('音量').locator('..').locator('span.font-medium')
  }

  async getStatus(): Promise<string> {
    return (await this.status.textContent())?.trim() || ''
  }

  async isPlaying(): Promise<boolean> {
    const status = await this.getStatus()
    return status === '播放中'
  }

  async getTrack(): Promise<string> {
    return (await this.track.textContent())?.trim() || ''
  }

  async getVolume(): Promise<number> {
    const text = await this.volume.textContent()
    return parseInt(text?.replace('%', '') || '0', 10)
  }
}

/**
 * 导航控制 Page Object
 */
export class NavigationControl {
  readonly page: Page
  readonly container: Locator
  readonly status: Locator
  readonly destination: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.bg-white, .dark\\:bg-gray-800').filter({ has: page.locator('text=导航') })
    this.status = this.container.locator('.text-xs.px-2.py-1')
    this.destination = this.container.getByText('目的地').locator('..').locator('span.font-medium')
  }

  async getStatus(): Promise<string> {
    return (await this.status.textContent())?.trim() || ''
  }

  async isActive(): Promise<boolean> {
    const status = await this.getStatus()
    return status === '导航中'
  }

  async getDestination(): Promise<string> {
    return (await this.destination.textContent())?.trim() || ''
  }
}
