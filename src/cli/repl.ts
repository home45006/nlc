import { createInterface } from 'node:readline'
import type { LLMProvider } from '../types/index.js'
import { DialogManager } from '../dialog/dialog-manager.js'
import { ZhipuProvider } from '../llm/providers/zhipu.js'
import { GeminiProvider } from '../llm/providers/gemini.js'
import { config } from '../config.js'
import {
  renderBanner,
  renderResult,
  renderError,
  renderVehicleState,
  renderHelp,
  renderHistory,
} from './renderer.js'

type ModelName = 'gemini' | 'glm' | 'claude'

interface ModelOption {
  readonly key: string
  readonly name: ModelName
  readonly label: string
  readonly available: boolean
}

function getAvailableModels(): ReadonlyArray<ModelOption> {
  return [
    { key: '1', name: 'gemini', label: 'Gemini 3 Flash', available: !!config.geminiApiKey },
    { key: '2', name: 'glm', label: 'GLM-4-Flash (智谱)', available: !!config.zhipuApiKey },
    { key: '3', name: 'claude', label: 'Claude (未实现)', available: false },
  ]
}

function selectModel(rl: ReturnType<typeof createInterface>): Promise<ModelName> {
  return new Promise((resolve) => {
    const models = getAvailableModels()

    console.log('')
    console.log('┌─────────────────────────────────┐')
    console.log('│      请选择要使用的模型          │')
    console.log('├─────────────────────────────────┤')
    for (const m of models) {
      const status = m.available ? '' : ' (不可用)'
      console.log(`│  ${m.key}. ${m.label}${status}`)
    }
    console.log('├─────────────────────────────────┤')
    console.log(`│  直接回车使用默认: ${config.defaultModel}`)
    console.log('└─────────────────────────────────┘')
    console.log('')

    rl.question('选择 [1/2/3]: ', (input) => {
      const trimmed = input.trim()

      if (!trimmed) {
        resolve(config.defaultModel)
        return
      }

      const selected = models.find(m => m.key === trimmed || m.name === trimmed)
      if (selected && selected.available) {
        resolve(selected.name)
      } else if (selected && !selected.available) {
        console.log(`\n  ${selected.label} 不可用，使用默认模型 ${config.defaultModel}\n`)
        resolve(config.defaultModel)
      } else {
        console.log(`\n  无效选择，使用默认模型 ${config.defaultModel}\n`)
        resolve(config.defaultModel)
      }
    })
  })
}

export async function startRepl(): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const selectedModel = await selectModel(rl)
  let provider = createProvider(selectedModel)
  const dialogManager = new DialogManager(provider)
  let debugMode = false

  renderBanner(provider.name)

  const prompt = (): void => {
    rl.question('你> ', async (input) => {
      const trimmed = input.trim()

      if (!trimmed) {
        prompt()
        return
      }

      if (trimmed.startsWith('/')) {
        handleCommand(trimmed)
        prompt()
        return
      }

      try {
        if (debugMode) {
          console.log(`\n  [debug] 发送到 ${provider.name}...`)
        }

        const result = await dialogManager.handleInput(trimmed)
        renderResult(result.output, result.stateChanges)
      } catch (error) {
        renderError(error)
      }

      prompt()
    })
  }

  function handleCommand(input: string): void {
    const parts = input.split(/\s+/)
    const cmd = parts[0]
    const arg = parts[1]

    switch (cmd) {
      case '/help':
        renderHelp()
        break

      case '/state':
        renderVehicleState(dialogManager.stateManager.getState())
        break

      case '/model': {
        const validModels: ModelName[] = ['gemini', 'glm', 'claude']
        if (!arg || !validModels.includes(arg as ModelName)) {
          console.log(`\n  当前模型: ${provider.name}`)
          console.log('  用法: /model gemini | /model glm | /model claude\n')
          break
        }
        try {
          provider = createProvider(arg as ModelName)
          dialogManager.switchProvider(provider)
          console.log(`\n  已切换到模型: ${provider.name}\n`)
        } catch (error) {
          renderError(error)
        }
        break
      }

      case '/history':
        renderHistory(dialogManager.getHistory())
        break

      case '/clear':
        dialogManager.clearHistory()
        console.log('\n  对话历史已清除。\n')
        break

      case '/reset':
        dialogManager.resetState()
        console.log('\n  车辆状态和对话历史已重置。\n')
        break

      case '/debug':
        debugMode = !debugMode
        console.log(`\n  调试模式: ${debugMode ? '开启' : '关闭'}\n`)
        break

      case '/quit':
      case '/exit':
        console.log('\n  再见!\n')
        rl.close()
        process.exit(0)

      default:
        console.log(`\n  未知命令: ${cmd}，输入 /help 查看帮助\n`)
    }
  }

  prompt()
}

function createProvider(model: ModelName): LLMProvider {
  if (model === 'gemini') {
    if (!config.geminiApiKey) {
      throw new Error('未配置 GEMINI_API_KEY，请在 .env 文件中设置')
    }
    return new GeminiProvider(config.geminiApiKey)
  }

  if (model === 'glm') {
    if (!config.zhipuApiKey) {
      throw new Error('未配置 ZHIPU_API_KEY，请在 .env 文件中设置')
    }
    return new ZhipuProvider(config.zhipuApiKey)
  }

  if (model === 'claude') {
    if (!config.claudeApiKey) {
      throw new Error('未配置 CLAUDE_API_KEY，请在 .env 文件中设置')
    }
    throw new Error('Claude Provider 尚未实现')
  }

  throw new Error(`不支持的模型: ${model}`)
}
