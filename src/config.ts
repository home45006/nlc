import 'dotenv/config'

interface Config {
  readonly zhipuApiKey: string
  readonly claudeApiKey: string
  readonly geminiApiKey: string
  readonly defaultModel: 'gemini' | 'glm' | 'claude'
}

function loadConfig(): Config {
  const zhipuApiKey = process.env.ZHIPU_API_KEY ?? ''
  const claudeApiKey = process.env.CLAUDE_API_KEY ?? ''
  const geminiApiKey = process.env.GEMINI_API_KEY ?? ''
  const defaultModel = (process.env.DEFAULT_MODEL ?? 'gemini') as 'gemini' | 'glm' | 'claude'

  // 启动时校验：至少需要一个 API Key
  if (!zhipuApiKey && !claudeApiKey && !geminiApiKey) {
    console.warn('[警告] 未配置任何 API Key，请在 .env 文件中设置 ZHIPU_API_KEY、CLAUDE_API_KEY 或 GEMINI_API_KEY')
  }

  // 校验默认模型是否有对应的 API Key
  if (defaultModel === 'gemini' && !geminiApiKey) {
    console.warn('[警告] 默认模型为 gemini，但未配置 GEMINI_API_KEY')
  } else if (defaultModel === 'glm' && !zhipuApiKey) {
    console.warn('[警告] 默认模型为 glm，但未配置 ZHIPU_API_KEY')
  } else if (defaultModel === 'claude' && !claudeApiKey) {
    console.warn('[警告] 默认模型为 claude，但未配置 CLAUDE_API_KEY')
  }

  return {
    zhipuApiKey,
    claudeApiKey,
    geminiApiKey,
    defaultModel,
  }
}

export const config = loadConfig()
