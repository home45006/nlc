/**
 * Skill Orchestrator CLI (V2 架构)
 *
 * 演示 FileBasedSkillOrchestrator 的 LLM 自主选择和调用过程
 */

import { createInterface } from 'node:readline'
import { config } from '../config.js'
import { GeminiProvider } from '../llm/providers/gemini.js'
import { ZhipuProvider } from '../llm/providers/zhipu.js'
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

type ModelName = 'gemini' | 'glm'

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
  return new Promise((resolve) => {
    console.log('')
    console.log('┌─────────────────────────────────┐')
    console.log('│      请选择要使用的模型          │')
    console.log('├─────────────────────────────────┤')
    if (config.geminiApiKey) {
      console.log('│  1. Gemini 3 Flash              │')
    }
    if (config.zhipuApiKey) {
      console.log('│  2. GLM-4-Flash (智谱)          │')
    }
    console.log('├─────────────────────────────────┤')
    console.log(`│  直接回车使用默认: ${config.defaultModel}`)
    console.log('└─────────────────────────────────┘')
    console.log('')

    rl.question('选择 [1/2]: ', (input) => {
      const trimmed = input.trim()

      if (!trimmed) {
        resolve(config.defaultModel as ModelName)
        return
      }

      if (trimmed === '1' && config.geminiApiKey) {
        resolve('gemini')
      } else if (trimmed === '2' && config.zhipuApiKey) {
        resolve('glm')
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
        if (!arg || !['gemini', 'glm'].includes(arg)) {
          console.log(`\n  当前模型: ${provider.name}`)
          console.log('  用法: /model gemini | /model glm')
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

// 启动 CLI
startSkillRepl().catch((error) => {
  console.error('Startup failed:', error)
  process.exit(1)
})
