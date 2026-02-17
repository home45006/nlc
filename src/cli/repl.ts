import { createInterface } from 'node:readline'
import type { LLMProvider } from '../types/index.js'
import { Domain } from '../types/domain.js'
import { NewDialogManager as DialogManager } from '../dialog/new-dialog-manager.js'
import { ZhipuProvider } from '../llm/providers/zhipu.js'
import { GeminiProvider } from '../llm/providers/gemini.js'
import { IntentRewriter } from '../llm/intent-rewriter.js'
import { config } from '../config.js'
import {
  renderBanner,
  renderResult,
  renderError,
  renderVehicleState,
  renderHelp,
  renderHistory,
  renderVerboseResult,
  type VerboseResult,
} from './renderer.js'

type ModelName = 'gemini' | 'glm' | 'claude'

/** 有效的领域类型 */
const VALID_DOMAINS = Object.values(Domain) as string[]

/**
 * 将字符串安全地转换为 DomainType
 * 如果不是有效领域，返回 'chat' 作为默认值
 */
function normalizeDomain(domain: string): typeof Domain[keyof typeof Domain] {
  if (VALID_DOMAINS.includes(domain)) {
    return domain as typeof Domain[keyof typeof Domain]
  }
  return Domain.CHAT
}

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
  let verboseMode = false  // 详细执行流程模式

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
        const totalStartTime = Date.now()

        if (debugMode) {
          console.log(`\n  [debug] 发送到 ${provider.name}...`)
        }

        // 收集详细的执行信息
        const result = await dialogManager.handleInput(trimmed)
        const totalEndTime = Date.now()

        if (verboseMode) {
          // 详细模式：展示完整的业务执行流程
          const verboseResult: VerboseResult = {
            userInput: trimmed,
            orchestrationResult: result.orchestrationResult,
            stateChanges: result.stateChanges,
            commands: result.orchestrationResult?.commands || [],
            timings: {
              orchestrator: result.output.meta.latencyMs,
              execution: totalEndTime - totalStartTime - result.output.meta.latencyMs,
              total: totalEndTime - totalStartTime,
            },
          }
          renderVerboseResult(verboseResult)
        } else {
          // 普通模式
          // 注意：NewDialogManager 的 output 没有 tokens 字段，需要补充默认值
          const outputWithTokens = {
            ...result.output,
            domain: normalizeDomain(result.output.domain),
            meta: {
              ...result.output.meta,
              tokens: { prompt: 0, completion: 0 },
            },
          }
          renderResult(outputWithTokens, result.stateChanges, undefined, result.originalInput)
        }
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
        renderVehicleState(dialogManager.getStateManager().getState())
        break

      case '/model': {
        const validModels: ModelName[] = ['gemini', 'glm', 'claude']
        if (!arg || !validModels.includes(arg as ModelName)) {
          console.log(`\n  当前模型: ${provider.name}`)
          console.log('  用法: /model gemini | /model glm | /model claude')
          console.log('  注意: 切换模型需要重启程序\n')
          break
        }
        console.log(`\n  切换模型需要重启程序。当前模型: ${provider.name}\n`)
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

      case '/verbose':
      case '/v':
        verboseMode = !verboseMode
        console.log(`\n  详细模式: ${verboseMode ? '开启' : '关闭'}\n`)
        if (verboseMode) {
          console.log('  将展示完整的业务执行流程，包括:')
          console.log('    - 用户输入阶段')
          console.log('    - Skill 编排阶段（意图识别、Skill 执行）')
          console.log('    - 命令执行阶段')
          console.log('    - 状态变更阶段')
          console.log('    - 响应生成阶段')
          console.log('')
        }
        break

      case '/rewrite':
        handleRewrite(parts.slice(1).join(' '))
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

  async function handleRewrite(input: string): Promise<void> {
    if (!input) {
      console.log('\n  用法: /rewrite <用户输入>')
      console.log('  示例: /rewrite 打开空调并播放音乐\n')
      return
    }

    try {
      const rewriter = new IntentRewriter(provider)

      const result = await rewriter.rewrite(input)

      console.log(`\n输入: "${result.original}"`)
      console.log('改写结果:')

      if (result.rewrittenQueries.length === 0) {
        console.log('  (无拆分结果)')
      } else {
        result.rewrittenQueries.forEach((q, i) => {
          console.log(`  ${i + 1}. [${q.domain}] "${q.query}"`)
        })
      }
      console.log('')
    } catch (error) {
      renderError(error)
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
