import 'dotenv/config'
import { logger } from './utils/logger.js'

interface Config {
  readonly zhipuApiKey: string
  readonly geminiApiKey: string
  readonly minimaxApiKey: string
  readonly minimaxModel: string
  readonly defaultModel: 'gemini' | 'glm' | 'minimax'
}

function loadConfig(): Config {
  const zhipuApiKey = process.env.ZHIPU_API_KEY ?? ''
  const geminiApiKey = process.env.GEMINI_API_KEY ?? ''
  const minimaxApiKey = process.env.MINIMAX_API_KEY ?? ''
  const minimaxModel = process.env.MINIMAX_MODEL ?? 'MiniMax-M2.5'
  const defaultModel = (process.env.DEFAULT_MODEL ?? 'glm') as 'gemini' | 'glm' | 'minimax'

  const configLogger = logger.module('Config')

  // 启动时校验：至少需要一个 API Key
  if (!zhipuApiKey && !geminiApiKey && !minimaxApiKey) {
    configLogger.warn('未配置任何 API Key，请在 .env 文件中设置 ZHIPU_API_KEY、GEMINI_API_KEY 或 MINIMAX_API_KEY')
  }

  // 校验默认模型是否有对应的 API Key
  if (defaultModel === 'gemini' && !geminiApiKey) {
    configLogger.warn('默认模型为 gemini，但未配置 GEMINI_API_KEY')
  } else if (defaultModel === 'glm' && !zhipuApiKey) {
    configLogger.warn('默认模型为 glm，但未配置 ZHIPU_API_KEY')
  } else if (defaultModel === 'minimax' && !minimaxApiKey) {
    configLogger.warn('默认模型为 minimax，但未配置 MINIMAX_API_KEY')
  }

  return {
    zhipuApiKey,
    geminiApiKey,
    minimaxApiKey,
    minimaxModel,
    defaultModel,
  }
}

export const config = loadConfig()
