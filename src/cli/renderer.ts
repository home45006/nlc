import type { DialogOutput, StateChange, VehicleState } from '../types/index.js'
import type { DomainRouting, Command } from '../core/types.js'
import type { OrchestrationResult } from '../skills/v2/file-based-orchestrator.js'
import type { RecognizedIntent, SkillResult } from '../skills/types.js'
import { MODE_MAP } from '../constants.js'

const DIVIDER = '───────── 识别结果 ─────────'
const DIVIDER_END = '────────────────────────────'

// ANSI 颜色代码
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const MAGENTA = '\x1b[35m'
const RED = '\x1b[31m'
const GRAY = '\x1b[90m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

export function renderBanner(model: string): void {
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  NLC Demo v0.1 - 智能座舱语言控制系统')
  console.log(`  模型: ${model} | 输入 /help 查看帮助`)
  console.log('═══════════════════════════════════════════')
  console.log('')
}

export function renderResult(
  output: DialogOutput,
  stateChanges: ReadonlyArray<StateChange>,
  routings?: ReadonlyArray<DomainRouting>,
  originalInput?: string,
): void {
  // 如果有多意图改写结果，优先显示
  if (routings && routings.length > 1 && originalInput) {
    console.log('')
    console.log(`输入: "${originalInput}"`)
    console.log('改写结果:')
    routings.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.domain}] "${r.rewrittenQuery}"`)
    })
    console.log('')
    // 也输出 TTS 回复
    if (output.ttsText) {
      console.log(`小智> ${output.ttsText}`)
    }
    console.log('')
    return
  }

  // 单意图时显示原有格式
  console.log('')
  console.log(DIVIDER)
  console.log(`  Domain: ${output.domain}`)
  console.log(`  Intent: ${output.intent}`)
  console.log(`  Slots:  ${JSON.stringify(output.slots)}`)
  console.log(DIVIDER_END)
  console.log('')

  if (output.ttsText) {
    console.log(`小智> ${output.ttsText}`)
  }

  if (stateChanges.length > 0) {
    console.log('')
    for (const change of stateChanges) {
      console.log(`  [变更] ${change.field}: ${change.from} → ${change.to}`)
    }
  }

  console.log('')
  console.log(`  ⏱ ${(output.meta.latencyMs / 1000).toFixed(1)}s | ${output.meta.model} | ${output.meta.tokens.prompt}+${output.meta.tokens.completion} tokens`)
  console.log('')
}

export function renderError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.log('')
  console.log(`  [错误] ${message}`)
  console.log('')
}

export function renderVehicleState(state: VehicleState): void {
  console.log('')
  console.log('───────── 车辆状态 ─────────')
  console.log(`  空调: ${state.ac.isOn ? '开启' : '关闭'} | ${state.ac.temperature}°C | ${MODE_MAP[state.ac.mode]} | 风速${state.ac.fanSpeed}`)
  console.log(`  车窗: 主驾${state.windows.frontLeft}% 副驾${state.windows.frontRight}% 左后${state.windows.rearLeft}% 右后${state.windows.rearRight}%`)
  console.log(`  座椅加热: 主驾${state.seats.driverHeating}挡 副驾${state.seats.passengerHeating}挡`)
  console.log(`  座椅通风: 主驾${state.seats.driverVentilation}挡 副驾${state.seats.passengerVentilation}挡`)
  console.log(`  氛围灯: ${state.lights.ambientOn ? `开启(${state.lights.ambientColor})` : '关闭'} | 阅读灯: ${state.lights.readingOn ? '开启' : '关闭'}`)
  console.log(`  后备箱: ${state.trunk.isOpen ? '打开' : '关闭'} | 雨刮: ${state.wiper.isOn ? `开启(${MODE_MAP[state.wiper.speed]})` : '关闭'}`)
  console.log(`  音乐: ${state.music.isPlaying ? `播放中(${state.music.track || '未知'})` : '未播放'} | 音量${state.music.volume}% | ${MODE_MAP[state.music.mode]}`)
  console.log(`  导航: ${state.navigation.isActive ? `${state.navigation.destination}(${MODE_MAP[state.navigation.routePreference]})` : '未导航'}`)
  console.log(`  电池: ${state.battery.level}% | 续航${state.battery.rangeKm}km`)
  console.log('────────────────────────────')
  console.log('')
}

export function renderHelp(): void {
  console.log('')
  console.log('───────── 帮助 ─────────')
  console.log('  输入自然语言指令与小智交互，例如:')
  console.log('    "把空调调到24度"')
  console.log('    "播放周杰伦的晴天"')
  console.log('    "导航到天安门"')
  console.log('    "还剩多少电"')
  console.log('')
  console.log('  特殊命令:')
  console.log('    /help     显示帮助')
  console.log('    /state    查看车辆状态')
  console.log('    /model    切换模型 (如: /model gemini)')
  console.log('    /history  查看对话历史')
  console.log('    /clear    清除对话历史')
  console.log('    /reset    重置车辆状态')
  console.log('    /rewrite  意图改写 (如: /rewrite 开空调并播放音乐)')
  console.log('    /skills   查看已加载 Skills (仅 skill 模式)')
  console.log('    /verbose  显示详细业务执行流程 (别名: /v)')
  console.log('    /stream   开关流式输出 (别名: /s)')
  console.log('    /debug    开关调试模式')
  console.log('    /quit     退出')
  console.log('────────────────────────')
  console.log('')
}

export function renderHistory(history: ReadonlyArray<{ role: string; content: string | null }>): void {
  console.log('')
  console.log('───────── 对话历史 ─────────')
  if (history.length === 0) {
    console.log('  (空)')
  } else {
    for (const msg of history) {
      if (msg.role === 'user') {
        console.log(`  你> ${msg.content || ''}`)
      } else if (msg.role === 'assistant' && msg.content) {
        console.log(`  小智> ${msg.content}`)
      }
    }
  }
  console.log('────────────────────────────')
  console.log('')
}

// ==================== Verbose Result Rendering ====================

/**
 * 详细业务执行流程结果
 */
export interface VerboseResult {
  /** 原始用户输入 */
  readonly userInput: string
  /** Orchestrator 完整结果 */
  readonly orchestrationResult?: OrchestrationResult
  /** 状态变更 */
  readonly stateChanges: ReadonlyArray<StateChange>
  /** 执行的命令 */
  readonly commands: Command[]
  /** 各阶段耗时 */
  readonly timings: {
    readonly orchestrator: number
    readonly execution: number
    readonly total: number
  }
}

/**
 * 渲染详细的业务执行流程
 */
export function renderVerboseResult(result: VerboseResult): void {
  const { userInput, orchestrationResult, stateChanges, commands, timings } = result

  renderVerboseHeader()
  renderUserInputStage(userInput)
  renderSkillOrchestrationStage(orchestrationResult, timings.orchestrator)
  renderCommandExecutionStage(commands, timings.execution)
  renderStateChangeStage(stateChanges)
  renderResponseStage(orchestrationResult?.response)
  renderVerboseFooter(timings.total)

  // 最终输出
  if (orchestrationResult?.response) {
    console.log(`${GREEN}小智> ${orchestrationResult.response}${RESET}`)
  }
  console.log('')
}

// ==================== Verbose Stage Renderers ====================

/** 渲染详细模式标题 */
function renderVerboseHeader(): void {
  console.log('')
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}`)
  console.log(`${BOLD}${CYAN}                    业务执行流程详情                         ${RESET}`)
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}`)
  console.log('')
}

/** 渲染用户输入阶段 */
function renderUserInputStage(userInput: string): void {
  console.log(`${BOLD}${BLUE}[1] 用户输入阶段${RESET}`)
  console.log(`${GRAY}├─${RESET} 输入内容: "${GREEN}${userInput}${RESET}"`)
  console.log(`${GRAY}└─${RESET} 输入长度: ${userInput.length} 字符`)
  console.log('')
}

/** 渲染 Skill 编排阶段 */
function renderSkillOrchestrationStage(
  orchestrationResult: OrchestrationResult | undefined,
  orchestratorTime: number
): void {
  console.log(`${BOLD}${BLUE}[2] Skill 编排阶段${RESET}`)

  if (!orchestrationResult) {
    console.log(`${GRAY}└─${RESET} 无编排结果`)
    console.log('')
    return
  }

  console.log(`${GRAY}├─${RESET} 处理状态: ${orchestrationResult.success ? `${GREEN}成功${RESET}` : `${RED}失败${RESET}`}`)
  renderIntents(orchestrationResult.intents)
  renderSkillResults(orchestrationResult.skillResults)
  console.log(`${GRAY}└─${RESET} 耗时: ${orchestratorTime}ms`)
  console.log('')
}

/** 渲染识别的意图 */
function renderIntents(intents: RecognizedIntent[] | undefined): void {
  if (!intents || intents.length === 0) {
    console.log(`${GRAY}├─${RESET} 识别意图: ${YELLOW}无（使用 Chat 处理）${RESET}`)
    return
  }

  console.log(`${GRAY}├─${RESET} 识别意图数: ${intents.length}`)
  intents.forEach((intent, idx) => {
    console.log(`${GRAY}│   ${RESET}[${idx + 1}] ${MAGENTA}${intent.skillId}${RESET}/${YELLOW}${intent.capability}${RESET}`)
    console.log(`${GRAY}│       ${RESET}Slots: ${JSON.stringify(intent.slots)}`)
    console.log(`${GRAY}│       ${RESET}置信度: ${(intent.confidence * 100).toFixed(0)}%`)
  })
}

/** 渲染 Skill 执行结果 */
function renderSkillResults(skillResults: SkillResult[]): void {
  if (skillResults.length === 0) return

  console.log(`${GRAY}├─${RESET} Skill 执行结果:`)
  skillResults.forEach((sr, idx) => {
    const status = sr.success ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
    console.log(`${GRAY}│   ${RESET}[${idx + 1}] ${status} ${sr.intent || 'unknown'}`)
    if (sr.ttsText) {
      console.log(`${GRAY}│       ${RESET}TTS: "${sr.ttsText}"`)
    }
  })
}

/** 渲染命令执行阶段 */
function renderCommandExecutionStage(commands: Command[], executionTime: number): void {
  console.log(`${BOLD}${BLUE}[3] 命令执行阶段${RESET}`)

  if (commands.length === 0) {
    console.log(`${GRAY}└─${RESET} 无命令生成`)
  } else {
    console.log(`${GRAY}├─${RESET} 生成命令数: ${commands.length}`)
    commands.forEach((cmd, idx) => {
      console.log(`${GRAY}│   ${RESET}[${idx + 1}] ${YELLOW}${cmd.type}${RESET}`)
      console.log(`${GRAY}│       ${RESET}参数: ${JSON.stringify(cmd.params)}`)
    })
    console.log(`${GRAY}└─${RESET} 耗时: ${executionTime}ms`)
  }
  console.log('')
}

/** 渲染状态变更阶段 */
function renderStateChangeStage(stateChanges: ReadonlyArray<StateChange>): void {
  console.log(`${BOLD}${BLUE}[4] 状态变更阶段${RESET}`)

  if (stateChanges.length === 0) {
    console.log(`${GRAY}└─${RESET} 无状态变更`)
  } else {
    console.log(`${GRAY}├─${RESET} 状态变更数: ${stateChanges.length}`)
    stateChanges.forEach((change, idx) => {
      console.log(`${GRAY}│   ${RESET}[${idx + 1}] ${change.field}`)
      console.log(`${GRAY}│       ${RESET} ${GRAY}${change.from}${RESET} → ${GREEN}${change.to}${RESET}`)
    })
  }
  console.log('')
}

/** 渲染响应生成阶段 */
function renderResponseStage(response: string | undefined): void {
  console.log(`${BOLD}${BLUE}[5] 响应生成阶段${RESET}`)
  if (response) {
    console.log(`${GRAY}├─${RESET} TTS 响应: "${GREEN}${response}${RESET}"`)
  }
  console.log('')
}

/** 渲染详细模式页脚 */
function renderVerboseFooter(totalTime: number): void {
  console.log(`${BOLD}${CYAN}───────────────────────────────────────────────────────────${RESET}`)
  console.log(`${BOLD}总耗时: ${YELLOW}${totalTime}ms${RESET} (${(totalTime / 1000).toFixed(2)}s)`)
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}`)
  console.log('')
}
