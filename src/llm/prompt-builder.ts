import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ChatMessage } from '../types/index.js'
import type { VehicleState } from '../types/index.js'
import { MODE_MAP } from '../constants.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPT_PATH = resolve(__dirname, '../../prompts/system.md')

function formatVehicleState(state: VehicleState): string {
  const windowDesc = (pct: number) => pct === 0 ? '关闭' : pct === 100 ? '全开' : `开启${pct}%`
  const heatingDesc = (level: number) => level === 0 ? '关闭' : `${level}挡`

  const lines = [
    `- 空调: ${state.ac.isOn ? '已开启' : '已关闭'}, 温度${state.ac.temperature}°C, ${MODE_MAP[state.ac.mode]}模式, 风速${state.ac.fanSpeed}`,
    `- 车窗: 主驾${windowDesc(state.windows.frontLeft)}, 副驾${windowDesc(state.windows.frontRight)}, 左后${windowDesc(state.windows.rearLeft)}, 右后${windowDesc(state.windows.rearRight)}`,
    `- 座椅: 主驾加热${heatingDesc(state.seats.driverHeating)}, 主驾通风${heatingDesc(state.seats.driverVentilation)}, 副驾加热${heatingDesc(state.seats.passengerHeating)}, 副驾通风${heatingDesc(state.seats.passengerVentilation)}`,
    `- 氛围灯: ${state.lights.ambientOn ? `已开启(${state.lights.ambientColor})` : '已关闭'}, 阅读灯: ${state.lights.readingOn ? '已开启' : '已关闭'}`,
    `- 后备箱: ${state.trunk.isOpen ? '已打开' : '已关闭'}`,
    `- 雨刮器: ${state.wiper.isOn ? `已开启(${MODE_MAP[state.wiper.speed]})` : '已关闭'}`,
    `- 音乐: ${state.music.isPlaying ? `播放中 - ${state.music.track || '未知曲目'}` : '未播放'}, 音量${state.music.volume}%, ${MODE_MAP[state.music.mode]}`,
    `- 导航: ${state.navigation.isActive ? `导航中 - ${state.navigation.destination}(${MODE_MAP[state.navigation.routePreference]})` : '未导航'}`,
    `- 电池: ${state.battery.level}%, 预计续航${state.battery.rangeKm}km`,
  ]

  return lines.join('\n')
}

export class PromptBuilder {
  private readonly systemTemplate: string

  constructor() {
    this.systemTemplate = readFileSync(PROMPT_PATH, 'utf-8')
  }

  buildMessages(
    userInput: string,
    history: ReadonlyArray<ChatMessage>,
    vehicleState: VehicleState,
  ): ReadonlyArray<ChatMessage> {
    const systemContent = this.systemTemplate.replace(
      '{{vehicle_state}}',
      formatVehicleState(vehicleState),
    )

    return [
      { role: 'system', content: systemContent },
      ...history,
      { role: 'user', content: userInput },
    ]
  }
}
