import type { ChatMessage, DialogOutput, LLMProvider, StateChange, ToolCall } from '../types/index.js'
import { LLMOrchestrator } from '../llm/orchestrator.js'
import { CommandExecutor } from '../executor/command-executor.js'
import { VehicleStateManager } from '../executor/vehicle-state.js'
import { AC_MODE_MAP, MUSIC_MODE_MAP, WIPER_SPEED_MAP, ROUTE_PREFERENCE_MAP } from '../constants.js'

const MAX_HISTORY_MESSAGES = 60

export interface DialogResult {
  readonly output: DialogOutput
  readonly stateChanges: ReadonlyArray<StateChange>
}

export class DialogManager {
  private orchestrator: LLMOrchestrator
  private readonly executor: CommandExecutor
  readonly stateManager: VehicleStateManager
  private history: ChatMessage[] = []

  constructor(provider: LLMProvider) {
    this.orchestrator = new LLMOrchestrator(provider)
    this.stateManager = new VehicleStateManager()
    this.executor = new CommandExecutor(this.stateManager)
  }

  async handleInput(userInput: string): Promise<DialogResult> {
    const vehicleState = this.stateManager.getState()

    const { output, toolCalls } = await this.orchestrator.process(
      userInput,
      this.history,
      vehicleState,
    )

    let stateChanges: ReadonlyArray<StateChange> = []
    let finalTtsText = output.ttsText

    if (output.hasCommand && toolCalls.length > 0) {
      stateChanges = this.executor.execute(toolCalls)

      // 如果 LLM 没返回 TTS 文本，基于状态变更生成
      if (!finalTtsText) {
        finalTtsText = this.generateTtsFromChanges(toolCalls, stateChanges)
      }

      // 记录历史: user → assistant(functionCall) → tool(results) → assistant(text确认)
      // 这个4步格式是 Gemini 多轮函数调用的标准格式
      this.history.push({ role: 'user', content: userInput })
      this.history.push({
        role: 'assistant',
        content: '',
        tool_calls: toolCalls,
      })

      for (const tc of toolCalls) {
        const params = JSON.parse(tc.function.arguments) as Record<string, unknown>
        this.history.push({
          role: 'tool',
          content: JSON.stringify({ success: true, action: params.action }),
          tool_call_id: tc.id,
        })
      }

      // 单独的 assistant 文本确认消息，确保下一个 user 消息不会与 tool response 合并
      this.history.push({ role: 'assistant', content: finalTtsText })
    } else {
      this.history.push({ role: 'user', content: userInput })
      this.history.push({ role: 'assistant', content: output.ttsText })
    }

    this.trimHistory()

    return {
      output: { ...output, ttsText: finalTtsText },
      stateChanges,
    }
  }

  private generateTtsFromChanges(
    toolCalls: ReadonlyArray<ToolCall>,
    changes: ReadonlyArray<StateChange>,
  ): string {
    if (changes.length === 0) return '好的，已为您操作。'

    // 根据 function name 和参数生成自然语言 TTS
    const descriptions: string[] = []

    for (const tc of toolCalls) {
      const params = JSON.parse(tc.function.arguments) as Record<string, unknown>
      const desc = this.describeAction(tc.function.name, params)
      if (desc) descriptions.push(desc)
    }

    if (descriptions.length > 0) {
      return `好的，已为您${descriptions.join('，并')}。`
    }

    return `好的，${changes.map(c => `${c.field}已调整为${c.to}`).join('，')}。`
  }

  private describeAction(functionName: string, params: Record<string, unknown>): string {
    const action = params.action as string

    const descriptions: Record<string, Record<string, string | ((p: Record<string, unknown>) => string)>> = {
      control_ac: {
        turn_on: '打开空调',
        turn_off: '关闭空调',
        set_temperature: (p) => `将空调温度调至${p.temperature}度`,
        set_mode: (p) => `将空调切换为${AC_MODE_MAP[p.mode as string] ?? p.mode}模式`,
        set_fan_speed: (p) => `将风速调至${p.fan_speed}挡`,
      },
      control_window: {
        open: (p) => `打开${this.windowName(p.position as string)}车窗`,
        close: (p) => `关闭${this.windowName(p.position as string)}车窗`,
        set_position: (p) => `将${this.windowName(p.position as string)}车窗开至${p.open_percentage}%`,
      },
      control_seat: {
        heating_on: (p) => `打开${this.seatName(p.seat as string)}座椅加热`,
        heating_off: (p) => `关闭${this.seatName(p.seat as string)}座椅加热`,
        set_heating_level: (p) => `将${this.seatName(p.seat as string)}座椅加热调至${p.level}挡`,
        ventilation_on: (p) => `打开${this.seatName(p.seat as string)}座椅通风`,
        ventilation_off: (p) => `关闭${this.seatName(p.seat as string)}座椅通风`,
        set_ventilation_level: (p) => `将${this.seatName(p.seat as string)}座椅通风调至${p.level}挡`,
      },
      control_light: {
        turn_on: (p) => `打开${p.light_type === 'ambient' ? '氛围灯' : '阅读灯'}`,
        turn_off: (p) => `关闭${p.light_type === 'ambient' ? '氛围灯' : '阅读灯'}`,
        set_color: (p) => `将氛围灯颜色调为${p.color}`,
      },
      control_trunk: {
        open: '打开后备箱',
        close: '关闭后备箱',
      },
      control_wiper: {
        turn_on: '打开雨刮器',
        turn_off: '关闭雨刮器',
        set_speed: (p) => `将雨刮速度调至${WIPER_SPEED_MAP[p.speed as string] ?? p.speed}`,
      },
      control_music: {
        play: '播放音乐',
        pause: '暂停音乐',
        next: '切换到下一首',
        previous: '切换到上一首',
        search_and_play: (p) => `搜索并播放"${p.query}"`,
        set_volume: (p) => `将音量调至${p.volume}%`,
        set_play_mode: (p) => `切换为${MUSIC_MODE_MAP[p.play_mode as string] ?? p.play_mode}模式`,
      },
      control_navigation: {
        set_destination: (p) => `导航到${p.destination}`,
        set_route_preference: (p) => `切换为${ROUTE_PREFERENCE_MAP[p.route_preference as string] ?? p.route_preference}`,
        cancel: '取消导航',
      },
    }

    const fnDescs = descriptions[functionName]
    if (!fnDescs) return ''

    const desc = fnDescs[action]
    if (!desc) return ''

    return typeof desc === 'function' ? desc(params) : desc
  }

  private windowName(position: string): string {
    const map: Record<string, string> = { front_left: '主驾', front_right: '副驾', rear_left: '左后', rear_right: '右后', all: '全部' }
    return map[position] ?? position
  }

  private seatName(seat: string): string {
    return seat === 'driver' ? '主驾' : '副驾'
  }

  getHistory(): ReadonlyArray<ChatMessage> {
    return this.history
  }

  clearHistory(): void {
    this.history = []
  }

  resetState(): void {
    this.stateManager.reset()
    this.history = []
  }

  switchProvider(provider: LLMProvider): void {
    this.orchestrator = new LLMOrchestrator(provider)
  }

  private trimHistory(): void {
    if (this.history.length > MAX_HISTORY_MESSAGES) {
      this.history = this.history.slice(-MAX_HISTORY_MESSAGES)
    }
  }
}
