import type { DialogOutput, StateChange, VehicleState } from '../types/index.js'
import type { DomainRouting } from '../core/types.js'
import { MODE_MAP } from '../constants.js'

const DIVIDER = '───────── 识别结果 ─────────'
const DIVIDER_END = '────────────────────────────'

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
  console.log('    /model    切换模型 (如: /model claude)')
  console.log('    /history  查看对话历史')
  console.log('    /clear    清除对话历史')
  console.log('    /reset    重置车辆状态')
  console.log('    /rewrite  意图改写 (如: /rewrite 开空调并播放音乐)')
  console.log('    /debug    开关调试模式')
  console.log('    /quit     退出')
  console.log('────────────────────────')
  console.log('')
}

export function renderHistory(history: ReadonlyArray<{ role: string; content: string }>): void {
  console.log('')
  console.log('───────── 对话历史 ─────────')
  if (history.length === 0) {
    console.log('  (空)')
  } else {
    for (const msg of history) {
      if (msg.role === 'user') {
        console.log(`  你> ${msg.content}`)
      } else if (msg.role === 'assistant' && msg.content) {
        console.log(`  小智> ${msg.content}`)
      }
    }
  }
  console.log('────────────────────────────')
  console.log('')
}
