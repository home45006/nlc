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
import { createDefaultVehicleState, type VehicleState } from '../types/vehicle.js'
import type { Command } from '../core/types.js'
import {
  FileBasedSkillOrchestrator,
  createFileBasedSkillOrchestrator,
} from '../skills/index.js'
import { VehicleStateManager } from '../executor/vehicle-state.js'

// ANSI 颜色代码
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
}

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

function renderBanner(): void {
  console.log('')
  console.log(COLORS.bright + COLORS.cyan + '╔═══════════════════════════════════════════════════════════════╗' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '     Skill Orchestrator V2 - 文件系统级 Skills 演示              ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '╠═══════════════════════════════════════════════════════════════╣' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '  命令:                                                        ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    /help      - 显示帮助                                      ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    /state     - 查看车辆状态                                   ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    /history   - 查看对话历史                                   ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    /skills    - 查看已加载 Skills                              ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    /model     - 切换模型                                       ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    /reset     - 重置车辆状态和对话历史                         ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    /quit      - 退出                                           ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '                                                               ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '  示例输入:                                                    ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    "打开空调，温度调到24度"                                    ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    "播放周杰伦的歌"                                           ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    "导航去机场"                                               ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '║' + COLORS.reset + '    "打开车窗并播放音乐" (多意图并行)                           ' + COLORS.bright + COLORS.cyan + '║' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '╚═══════════════════════════════════════════════════════════════╝' + COLORS.reset)
  console.log('')
}

function renderHelp(): void {
  console.log('')
  console.log(COLORS.yellow + '命令列表:' + COLORS.reset)
  console.log('  /help      - 显示此帮助')
  console.log('  /state     - 查看当前车辆状态')
  console.log('  /history   - 查看对话历史')
  console.log('  /skills    - 查看已加载 Skills')
  console.log('  /model     - 切换模型 (gemini/glm)')
  console.log('  /reset     - 重置车辆状态和对话历史')
  console.log('  /quit      - 退出程序')
  console.log('')
  console.log(COLORS.yellow + '示例输入:' + COLORS.reset)
  console.log('  "打开空调"')
  console.log('  "温度调到24度"')
  console.log('  "打开车窗"')
  console.log('  "播放周杰伦的歌"')
  console.log('  "导航去国贸"')
  console.log('  "打开空调，温度24度，然后播放音乐"  (多意图并行)')
  console.log('')
}

function renderState(state: VehicleState): void {
  console.log('')
  console.log(COLORS.cyan + '┌─────────────────────────────────────────────────────────────┐' + COLORS.reset)
  console.log(COLORS.cyan + '│ Vehicle State' + COLORS.reset)
  console.log(COLORS.cyan + '├─────────────────────────────────────────────────────────────┤' + COLORS.reset)
  console.log(`  AC: ${state.ac.isOn ? COLORS.green + 'ON' : COLORS.red + 'OFF'}${COLORS.reset} | Temp: ${state.ac.temperature}C | Fan: ${state.ac.fanSpeed} | Mode: ${state.ac.mode}`)
  console.log(`  Windows: FL${state.windows.frontLeft}% FR${state.windows.frontRight}% RL${state.windows.rearLeft}% RR${state.windows.rearRight}%`)
  console.log(`  Seats: Driver Heat${state.seats.driverHeating} Vent${state.seats.driverVentilation} | Passenger Heat${state.seats.passengerHeating} Vent${state.seats.passengerVentilation}`)
  console.log(`  Lights: Ambient${state.lights.ambientOn ? COLORS.green + 'ON' : COLORS.dim + 'OFF'}${COLORS.reset}(${state.lights.ambientColor}) | Reading${state.lights.readingOn ? COLORS.green + 'ON' : COLORS.dim + 'OFF'}${COLORS.reset}`)
  console.log(`  Trunk: ${state.trunk.isOpen ? COLORS.yellow + 'OPEN' : COLORS.dim + 'CLOSED'}${COLORS.reset} | Wiper: ${state.wiper.isOn ? 'ON(' + state.wiper.speed + ')' : 'OFF'}`)
  console.log(`  Music: ${state.music.isPlaying ? COLORS.green + 'PLAYING' : COLORS.dim + 'PAUSED'}${COLORS.reset} | ${state.music.track || 'None'} | Vol: ${state.music.volume}% | Mode: ${state.music.mode}`)
  console.log(`  Nav: ${state.navigation.isActive ? COLORS.green + 'NAVIGATING -> ' + state.navigation.destination : COLORS.dim + 'INACTIVE'}${COLORS.reset} | Pref: ${state.navigation.routePreference}`)
  console.log(`  Battery: ${state.battery.level}% | Range: ${state.battery.rangeKm}km`)
  console.log(COLORS.cyan + '└─────────────────────────────────────────────────────────────┘' + COLORS.reset)
  console.log('')
}

function renderHistory(history: ChatMessage[]): void {
  console.log('')
  console.log(COLORS.cyan + '┌─────────────────────────────────────────────────────────────┐' + COLORS.reset)
  console.log(COLORS.cyan + '| Dialog History (Last ' + history.length + ' messages)' + COLORS.reset)
  console.log(COLORS.cyan + '├─────────────────────────────────────────────────────────────┤' + COLORS.reset)

  if (history.length === 0) {
    console.log('  (No history)')
  } else {
    for (let i = 0; i < history.length; i++) {
      const msg = history[i]
      const roleIcon = msg.role === 'user' ? 'User' : 'Bot'
      const roleColor = msg.role === 'user' ? COLORS.green : COLORS.blue
      const content = msg.content.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content
      console.log(`  ${roleIcon} ${roleColor}${content}${COLORS.reset}`)
    }
  }

  console.log(COLORS.cyan + '└─────────────────────────────────────────────────────────────┘' + COLORS.reset)
  console.log('')
}

function renderSkills(skills: { id: string; name: string; capabilities: { name: string }[] }[]): void {
  console.log('')
  console.log(COLORS.cyan + '┌─────────────────────────────────────────────────────────────┐' + COLORS.reset)
  console.log(COLORS.cyan + '| Loaded Skills (' + skills.length + ')' + COLORS.reset)
  console.log(COLORS.cyan + '├─────────────────────────────────────────────────────────────┤' + COLORS.reset)

  for (const skill of skills) {
    console.log(`  ${COLORS.yellow}${skill.name}${COLORS.reset} (${skill.id})`)
    console.log(`    Capabilities: ${skill.capabilities.map(c => c.name).join(', ')}`)
  }

  console.log(COLORS.cyan + '└─────────────────────────────────────────────────────────────┘' + COLORS.reset)
  console.log('')
}

async function selectModel(rl: ReturnType<typeof createInterface>): Promise<ModelName> {
  return new Promise((resolve) => {
    // 显示模型选择
    process.stdout.write('\n')
    process.stdout.write('+-----------------------------+\n')
    process.stdout.write('|      Select Model           |\n')
    process.stdout.write('+-----------------------------+\n')
    if (config.geminiApiKey) {
      process.stdout.write('|  1. Gemini (Recommended)    |\n')
    }
    if (config.zhipuApiKey) {
      process.stdout.write('|  2. GLM-4 (Zhipu)           |\n')
    }
    process.stdout.write('+-----------------------------+\n')
    process.stdout.write('\n')

    rl.question('Select [1/2, Enter for default]: ', (input) => {
      const trimmed = input.trim()
      if (trimmed === '1' && config.geminiApiKey) {
        resolve('gemini')
      } else if (trimmed === '2' && config.zhipuApiKey) {
        resolve('glm')
      } else if (config.geminiApiKey) {
        console.log('  Using default: Gemini\n')
        resolve('gemini')
      } else if (config.zhipuApiKey) {
        console.log('  Using default: GLM\n')
        resolve('glm')
      } else {
        console.log(COLORS.red + 'Error: No API Key configured' + COLORS.reset)
        process.exit(1)
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
  // 确保输出不被缓冲
  if (process.stdout.isTTY) {
    process.stdout.setDefaultEncoding?.('utf8')
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  // 显示欢迎信息
  console.log('')
  console.log(COLORS.bright + COLORS.cyan + '+---------------------------------------------------------------+' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '|' + COLORS.reset + '     Skill Orchestrator V2 - File-based Skills Demo              ' + COLORS.bright + COLORS.cyan + '|' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '+---------------------------------------------------------------+' + COLORS.reset)
  console.log('')

  // 选择模型
  const selectedModel = await selectModel(rl)
  const provider = createProvider(selectedModel)

  // 创建 FileBasedSkillOrchestrator（启用详细日志）
  const orchestrator = createFileBasedSkillOrchestrator(provider, {
    enableLogging: true,
    maxHistoryLength: MAX_HISTORY,
  })

  // 初始化 Orchestrator
  await orchestrator.initialize()
  const skills = orchestrator.getSkills()

  // 车辆状态管理器
  const stateManager = new VehicleStateManager()

  // 对话历史
  const dialogHistory: ChatMessage[] = []

  renderBanner()
  console.log(COLORS.green + `* Connected to ${provider.name}` + COLORS.reset)
  console.log(COLORS.dim + `* Loaded ${skills.length} skills from file system` + COLORS.reset)
  console.log(COLORS.dim + `* Dialog history: last ${MAX_HISTORY} turns` + COLORS.reset)
  console.log('')

  const prompt = (): void => {
    rl.question(COLORS.bright + 'You> ' + COLORS.reset, async (input) => {
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
        // 获取当前车辆状态
        const vehicleState = stateManager.getState()

        // 调用 Orchestrator
        const result = await orchestrator.process(trimmed, {
          vehicleState,
          dialogHistory: [...dialogHistory],  // 传入历史副本
        })

        // 更新对话历史
        dialogHistory.push({ role: 'user', content: trimmed })
        dialogHistory.push({ role: 'assistant', content: result.response })

        // 保持历史在 MAX_HISTORY 条以内（用户+助手消息对）
        while (dialogHistory.length > MAX_HISTORY * 2) {
          dialogHistory.shift()
          dialogHistory.shift()
        }

        // 同步状态：根据指令更新车辆状态
        if (result.success && result.commands.length > 0) {
          applyCommandsToState(stateManager, result.commands)

          // 显示状态变更
          const newState = stateManager.getState()
          console.log()
          console.log(COLORS.dim + 'Commands executed:' + COLORS.reset)
          for (const cmd of result.commands) {
            console.log(COLORS.dim + `   - ${cmd.type}: ${JSON.stringify(cmd.params)}` + COLORS.reset)
          }
          console.log()
          renderState(newState)
        }

        // 显示识别的意图
        if (result.intents && result.intents.length > 0) {
          console.log(COLORS.dim + 'Recognized intents:' + COLORS.reset)
          for (const intent of result.intents) {
            console.log(COLORS.dim + `   - ${intent.skillId}/${intent.capability} (${intent.confidence})` + COLORS.reset)
          }
          console.log()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.log(COLORS.red + `Error: ${message}` + COLORS.reset)
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
        renderState(stateManager.getState())
        break

      case '/history':
        renderHistory(dialogHistory)
        break

      case '/skills':
        renderSkills(skills)
        break

      case '/model':
        if (!arg || !['gemini', 'glm'].includes(arg)) {
          console.log(`\n  Current model: ${provider.name}`)
          console.log('  Usage: /model gemini | /model glm\n')
          break
        }
        console.log(`\n  Model switch requires restart\n`)
        break

      case '/reset':
        stateManager.reset()
        dialogHistory.length = 0
        console.log('\n  Vehicle state and dialog history reset.\n')
        break

      case '/quit':
      case '/exit':
        console.log('\n  Goodbye!\n')
        rl.close()
        process.exit(0)

      default:
        console.log(`\n  Unknown command: ${cmd}, type /help for help\n`)
    }
  }

  prompt()
}

// 启动 CLI
startSkillRepl().catch((error) => {
  console.error('Startup failed:', error)
  process.exit(1)
})
