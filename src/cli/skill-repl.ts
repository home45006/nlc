import { createInterface } from 'node:readline'
import { config } from '../config.js'
import { GeminiProvider } from '../llm/providers/gemini.js'
import { ZhipuProvider } from '../llm/providers/zhipu.js'
import { MiniMaxProvider } from '../llm/providers/minimax.js'
import type { LLMProvider, ChatMessage } from '../types/llm.js'
import type { Command } from '../core/types.js'
import type { Skill } from '../skills/types.js'
import { Domain } from '../types/domain.js'
import { createFileBasedSkillOrchestrator } from '../skills/index.js'
import { VehicleStateManager } from '../executor/vehicle-state.js'
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

type ModelName = 'gemini' | 'glm' | 'minimax'

// 对话历史最大条数
const MAX_HISTORY = 5

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

  if (model === 'minimax') {
    if (!config.minimaxApiKey) {
      throw new Error('未配置 MINIMAX_API_KEY，请在 .env 文件中设置')
    }
    return new MiniMaxProvider(config.minimaxApiKey)
  }

  throw new Error(`不支持的模型: ${model}`)
}

/** 有效的领域类型 */
const VALID_DOMAINS = Object.values(Domain) as string[]

/**
 * 将字符串安全地转换为 DomainType
 */
function normalizeDomain(domain: string): typeof Domain[keyof typeof Domain] {
  if (VALID_DOMAINS.includes(domain)) {
    return domain as typeof Domain[keyof typeof Domain]
  }
  return Domain.CHAT
}

/** 渲染已加载的 Skills 列表 */
function renderSkills(skills: Skill[]): void {
  console.log('')
  console.log('───────── 已加载 Skills ─────────')
  for (const skill of skills) {
    console.log(`  ${skill.name} (${skill.id})`)
    console.log(`    能力: ${skill.capabilities.map(c => c.name).join(', ')}`)
  }
  console.log('────────────────────────────')
  console.log('')
}

async function selectModel(rl: ReturnType<typeof createInterface>): Promise<ModelName> {
  // 优先使用命令行参数指定模型
  const modelArg = process.argv.find(arg => arg.startsWith('--model='))
  if (modelArg) {
    const model = modelArg.split('=')[1] as ModelName
    if (['gemini', 'glm', 'minimax'].includes(model)) {
      console.log(`  使用命令行指定的模型: ${model}\n`)
      return model
    }
  }

  // 其次使用环境变量指定模型
  const envModel = process.env.NLC_MODEL as ModelName | undefined
  if (envModel && ['gemini', 'glm', 'minimax'].includes(envModel)) {
    console.log(`  使用环境变量指定的模型: ${envModel}\n`)
    return envModel
  }

  // 检查 readline 是否已关闭
  if (rl.closed) {
    return config.defaultModel as ModelName
  }

  // 显示模型选择菜单
  console.log('')
  console.log('┌─────────────────────────────────┐')
  console.log('│      请选择要使用的模型          │')
  console.log('├─────────────────────────────────┤')
  if (config.geminiApiKey) {
    const isDefault = config.defaultModel === 'gemini'
    console.log(`│  1. Gemini 3 Flash${isDefault ? ' [默认]' : ''}            │`)
  }
  if (config.zhipuApiKey) {
    const isDefault = config.defaultModel === 'glm'
    console.log(`│  2. GLM-4-Flash (智谱)${isDefault ? ' [默认]' : ''}      │`)
  }
  if (config.minimaxApiKey) {
    const isDefault = config.defaultModel === 'minimax'
    console.log(`│  3. MiniMax M2.5${isDefault ? ' [默认]' : ''}               │`)
  }
  console.log('├─────────────────────────────────┤')
  console.log(`│  直接回车使用默认: ${config.defaultModel}`)
  console.log('└─────────────────────────────────┘')
  console.log('')

  // 使用 readline 等待输入
  return new Promise((resolve) => {
    rl.question('选择 [1/2/3]: ', (input) => {
      const trimmed = input.trim()

      if (!trimmed) {
        resolve(config.defaultModel as ModelName)
        return
      }

      if (trimmed === '1' && config.geminiApiKey) {
        resolve('gemini')
      } else if (trimmed === '2' && config.zhipuApiKey) {
        resolve('glm')
      } else if (trimmed === '3' && config.minimaxApiKey) {
        resolve('minimax')
      } else {
        console.log(`\n  使用默认模型: ${config.defaultModel}\n`)
        resolve(config.defaultModel as ModelName)
      }
    })
  })
}

/**
 * 根据指令更新车辆状态
 */
function applyCommandsToState(
  stateManager: VehicleStateManager,
  commands: Command[]
): void {
  for (const cmd of commands) {
    stateManager.applyCommand(cmd.type, cmd.params)
  }
}

export async function startSkillRepl(): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  let isExiting = false

  /**
   * 统一退出函数（用于 /quit、/exit、SIGTERM 等正常退出路径）
   * @param message 退出提示（undefined 表示静默退出）
   */
  function gracefulExit(message?: string): void {
    if (isExiting) return
    isExiting = true

    rl.close()
    if (message) {
      console.log(message)
    }
    process.exit(0)
  }

  // 用户按 Ctrl+C 的处理流程：
  // readline raw mode 拦截了终端 Ctrl+C，内核不会向进程组广播 SIGINT。
  // 只杀 ppid（tsx watch）会产生孤儿子进程：tsx watch 死了但我们自己还活着，
  // tsx watch 来不及杀子进程，孤儿进程占着 stdin，下次启动时导致输入混乱。
  // 解决方案：向进程组（pid=0）发 SIGKILL，子进程和 tsx watch 同时立即死亡，
  // 不产生孤儿，无竞态。用户的 shell（不在此进程组）不受影响。
  rl.on('SIGINT', () => {
    if (isExiting) return
    isExiting = true
    process.stdout.write('\n\n  程序已退出.\n\n')
    process.kill(0, 'SIGKILL')
  })

  // tsx watch 重启时发 SIGTERM：静默退出，不反杀父进程（否则 tsx watch 也会退出）
  process.on('SIGTERM', () => {
    gracefulExit()
  })

  // 选择模型
  const selectedModel = await selectModel(rl)
  const provider = createProvider(selectedModel)

  // 创建 FileBasedSkillOrchestrator
  const orchestrator = createFileBasedSkillOrchestrator(provider, {
    enableLogging: false,
    maxHistoryLength: MAX_HISTORY,
  })

  // 初始化 Orchestrator
  await orchestrator.initialize()
  const skills = orchestrator.getSkills()

  // 车辆状态管理器
  const stateManager = new VehicleStateManager()

  // 对话历史
  const dialogHistory: ChatMessage[] = []

  // 模式开关
  let verboseMode = false

  renderBanner(provider.name)
  console.log(`  已加载 ${skills.length} 个 Skills | 输入 /help 查看帮助`)
  console.log('')

  const prompt = (): void => {
    // 检查 readline 是否已关闭
    if (rl.closed) {
      return
    }

    rl.question('你> ', async (input) => {
      const trimmed = input.trim()

      if (!trimmed) {
        prompt()
        return
      }

      // 处理命令
      if (trimmed.startsWith('/')) {
        handleCommand(trimmed)
        prompt()
        return
      }

      try {
        const totalStartTime = Date.now()

        // 获取当前车辆状态
        const vehicleState = stateManager.getState()

        // 调用 Orchestrator
        const result = await orchestrator.process(trimmed, {
          vehicleState,
          dialogHistory: [...dialogHistory],
        })

        const totalEndTime = Date.now()

        // 更新对话历史
        dialogHistory.push({ role: 'user', content: trimmed })
        dialogHistory.push({ role: 'assistant', content: result.response })

        // 保持历史在 MAX_HISTORY 条以内
        while (dialogHistory.length > MAX_HISTORY * 2) {
          dialogHistory.shift()
          dialogHistory.shift()
        }

        // 同步状态：根据指令更新车辆状态
        if (result.success && result.commands.length > 0) {
          applyCommandsToState(stateManager, result.commands)
        }

        // 渲染结果
        if (verboseMode) {
          const verboseResult: VerboseResult = {
            userInput: trimmed,
            orchestrationResult: result,
            stateChanges: getStateChanges(stateManager, result.commands),
            commands: result.commands,
            timings: {
              orchestrator: totalEndTime - totalStartTime,
              execution: 0,
              total: totalEndTime - totalStartTime,
            },
          }
          renderVerboseResult(verboseResult)
        } else {
          const output = {
            domain: normalizeDomain(result.intents?.[0]?.skillId || 'chat'),
            intent: result.intents?.[0]?.capability || 'unknown',
            slots: result.intents?.[0]?.slots || {},
            confidence: result.intents?.[0]?.confidence || 0.5,
            ttsText: result.response,
            hasCommand: result.commands.length > 0,
            meta: {
              model: provider.name,
              latencyMs: totalEndTime - totalStartTime,
              tokens: { prompt: 0, completion: 0 },
            },
          }
          renderResult(output, getStateChanges(stateManager, result.commands), undefined, trimmed)
        }
      } catch (error) {
        renderError(error)
      }

      prompt()
    })
  }

  /**
   * 获取状态变更列表
   */
  function getStateChanges(
    _stateMgr: VehicleStateManager,
    commands: Command[]
  ): { field: string; from: string; to: string }[] {
    const changes: { field: string; from: string; to: string }[] = []
    // 简单实现：返回命令作为变更
    for (const cmd of commands) {
      changes.push({
        field: cmd.type,
        from: '-',
        to: JSON.stringify(cmd.params),
      })
    }
    return changes
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
        renderVehicleState(stateManager.getState())
        break

      case '/history':
        renderHistory(dialogHistory)
        break

      case '/skills':
        renderSkills(skills)
        break

      case '/model':
        if (!arg || !['gemini', 'glm', 'minimax'].includes(arg)) {
          console.log(`\n  当前模型: ${provider.name}`)
          console.log('  用法: /model gemini | /model glm | /model minimax')
          console.log('  注意: 切换模型需要重启程序\n')
          break
        }
        console.log(`\n  切换模型需要重启程序。当前模型: ${provider.name}\n`)
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

      case '/reset':
        stateManager.reset()
        dialogHistory.length = 0
        console.log('\n  车辆状态和对话历史已重置。\n')
        break

      case '/clear':
        dialogHistory.length = 0
        console.log('\n  对话历史已清除。\n')
        break

      case '/quit':
      case '/exit':
        gracefulExit('\n  再见!\n')
        return

      default:
        console.log(`\n  未知命令: ${cmd}，输入 /help 查看帮助\n`)
    }
  }

  prompt()
}
