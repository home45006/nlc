import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // 重置模块缓存
    vi.resetModules()
    // 保存原始环境变量
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv
  })

  it('应该加载所有API密钥', async () => {
    process.env.ZHIPU_API_KEY = 'test-zhipu-key'
    process.env.CLAUDE_API_KEY = 'test-claude-key'
    process.env.GEMINI_API_KEY = 'test-gemini-key'
    process.env.DEFAULT_MODEL = 'gemini'

    const { config } = await import('../config.js')

    expect(config.zhipuApiKey).toBe('test-zhipu-key')
    expect(config.claudeApiKey).toBe('test-claude-key')
    expect(config.geminiApiKey).toBe('test-gemini-key')
    expect(config.defaultModel).toBe('gemini')
  })

  it('应该使用默认模型gemini', async () => {
    delete process.env.DEFAULT_MODEL
    process.env.GEMINI_API_KEY = 'test-key'

    const { config } = await import('../config.js')

    expect(config.defaultModel).toBe('gemini')
  })

  it('应该在缺少API密钥时显示警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    delete process.env.ZHIPU_API_KEY
    delete process.env.CLAUDE_API_KEY
    delete process.env.GEMINI_API_KEY

    await import('../config.js')

    expect(warnSpy).toHaveBeenCalledWith(
      '[警告] 未配置任何 API Key，请在 .env 文件中设置 ZHIPU_API_KEY、CLAUDE_API_KEY 或 GEMINI_API_KEY'
    )

    warnSpy.mockRestore()
  })

  it('应该在默认模型为gemini但缺少密钥时警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    process.env.DEFAULT_MODEL = 'gemini'
    delete process.env.GEMINI_API_KEY
    process.env.ZHIPU_API_KEY = 'test-key'

    await import('../config.js')

    expect(warnSpy).toHaveBeenCalledWith(
      '[警告] 默认模型为 gemini，但未配置 GEMINI_API_KEY'
    )

    warnSpy.mockRestore()
  })

  it('应该在默认模型为glm但缺少密钥时警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    process.env.DEFAULT_MODEL = 'glm'
    delete process.env.ZHIPU_API_KEY
    process.env.GEMINI_API_KEY = 'test-key'

    await import('../config.js')

    expect(warnSpy).toHaveBeenCalledWith(
      '[警告] 默认模型为 glm，但未配置 ZHIPU_API_KEY'
    )

    warnSpy.mockRestore()
  })

  it('应该在默认模型为claude但缺少密钥时警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    process.env.DEFAULT_MODEL = 'claude'
    delete process.env.CLAUDE_API_KEY
    process.env.GEMINI_API_KEY = 'test-key'

    await import('../config.js')

    expect(warnSpy).toHaveBeenCalledWith(
      '[警告] 默认模型为 claude，但未配置 CLAUDE_API_KEY'
    )

    warnSpy.mockRestore()
  })

  it('应该支持glm作为默认模型', async () => {
    vi.resetModules()

    process.env.DEFAULT_MODEL = 'glm'
    process.env.ZHIPU_API_KEY = 'test-zhipu-key'

    const { config } = await import('../config.js')

    expect(config.defaultModel).toBe('glm')
  })

  it('应该支持claude作为默认模型', async () => {
    vi.resetModules()

    process.env.DEFAULT_MODEL = 'claude'
    process.env.CLAUDE_API_KEY = 'test-claude-key'

    const { config } = await import('../config.js')

    expect(config.defaultModel).toBe('claude')
  })
})
