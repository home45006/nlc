/**
 * LLM Provider 工厂
 */

import type { LLMProvider } from '../../types/llm.js'
import { GeminiProvider } from './gemini.js'
import { ZhipuProvider } from './zhipu.js'

export type ProviderType = 'gemini' | 'glm' | 'zhipu'

/**
 * 创建 LLM Provider
 */
export function createProvider(type: ProviderType): LLMProvider {
  switch (type) {
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required')
      }
      return new GeminiProvider(apiKey)
    }

    case 'glm':
    case 'zhipu': {
      const apiKey = process.env.ZHIPU_API_KEY
      if (!apiKey) {
        throw new Error('ZHIPU_API_KEY environment variable is required')
      }
      return new ZhipuProvider(apiKey)
    }

    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}

/**
 * 获取默认 Provider 类型
 */
export function getDefaultProviderType(): ProviderType {
  const model = process.env.DEFAULT_MODEL || 'gemini'
  if (model === 'glm' || model === 'zhipu') {
    return 'zhipu'
  }
  return 'gemini'
}

/**
 * 创建默认 Provider
 */
export function createDefaultProvider(): LLMProvider {
  return createProvider(getDefaultProviderType())
}

export { GeminiProvider, ZhipuProvider }
