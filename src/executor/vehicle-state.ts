import type { VehicleState } from '../types/index.js'
import type { StateChange } from '../types/index.js'
import { createDefaultVehicleState } from '../types/index.js'
import { AC_MODE_MAP, WIPER_SPEED_MAP, MUSIC_MODE_MAP, ROUTE_PREFERENCE_MAP } from '../constants.js'

export class VehicleStateManager {
  private state: VehicleState

  constructor() {
    this.state = createDefaultVehicleState()
  }

  getState(): VehicleState {
    return this.state
  }

  reset(): void {
    this.state = createDefaultVehicleState()
  }

  applyCommand(functionName: string, params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const handlers: Record<string, () => ReadonlyArray<StateChange>> = {
      control_ac: () => this.handleAc(params),
      control_window: () => this.handleWindow(params),
      control_seat: () => this.handleSeat(params),
      control_light: () => this.handleLight(params),
      control_trunk: () => this.handleTrunk(params),
      control_wiper: () => this.handleWiper(params),
      control_music: () => this.handleMusic(params),
      control_navigation: () => this.handleNavigation(params),
    }

    const handler = handlers[functionName]
    return handler ? handler() : []
  }

  private handleAc(params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const changes: StateChange[] = []
    const action = params.action as string

    if (action === 'turn_on' && !this.state.ac.isOn) {
      changes.push({ field: '空调', from: '关闭', to: '开启' })
      this.state = { ...this.state, ac: { ...this.state.ac, isOn: true } }
    } else if (action === 'turn_off' && this.state.ac.isOn) {
      changes.push({ field: '空调', from: '开启', to: '关闭' })
      this.state = { ...this.state, ac: { ...this.state.ac, isOn: false } }
    } else if (action === 'set_temperature' && typeof params.temperature === 'number') {
      const oldTemp = this.state.ac.temperature
      changes.push({ field: '空调温度', from: `${oldTemp}°C`, to: `${params.temperature}°C` })
      this.state = { ...this.state, ac: { ...this.state.ac, temperature: params.temperature, isOn: true } }
    } else if (action === 'set_mode' && typeof params.mode === 'string') {
      changes.push({ field: '空调模式', from: AC_MODE_MAP[this.state.ac.mode] ?? this.state.ac.mode, to: AC_MODE_MAP[params.mode] ?? params.mode })
      this.state = { ...this.state, ac: { ...this.state.ac, mode: params.mode as VehicleState['ac']['mode'], isOn: true } }
    } else if (action === 'set_fan_speed' && typeof params.fan_speed === 'number') {
      changes.push({ field: '风速', from: `${this.state.ac.fanSpeed}`, to: `${params.fan_speed}` })
      this.state = { ...this.state, ac: { ...this.state.ac, fanSpeed: params.fan_speed } }
    }

    return changes
  }

  private handleWindow(params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const changes: StateChange[] = []
    const position = params.position as string
    const action = params.action as string

    const posMap: Record<string, string> = { front_left: '主驾', front_right: '副驾', rear_left: '左后', rear_right: '右后', all: '全部' }
    const keys = position === 'all'
      ? ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'] as const
      : [position.replace('front_left', 'frontLeft').replace('front_right', 'frontRight').replace('rear_left', 'rearLeft').replace('rear_right', 'rearRight')] as const

    const targetPct = action === 'open' ? 100 : action === 'close' ? 0 : (params.open_percentage as number ?? 50)

    const newWindows = { ...this.state.windows }
    for (const key of keys) {
      const k = key as keyof typeof newWindows
      const old = newWindows[k]
      if (old !== targetPct) {
        changes.push({ field: `${posMap[position] ?? position}车窗`, from: `${old}%`, to: `${targetPct}%` })
        ;(newWindows as Record<string, number>)[k] = targetPct
      }
    }
    this.state = { ...this.state, windows: newWindows }
    return changes
  }

  private handleSeat(params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const changes: StateChange[] = []
    const seat = params.seat as string
    const action = params.action as string
    const label = seat === 'driver' ? '主驾' : '副驾'

    const newSeats = { ...this.state.seats }

    if (action === 'heating_on') {
      const key = seat === 'driver' ? 'driverHeating' : 'passengerHeating'
      changes.push({ field: `${label}座椅加热`, from: `${newSeats[key]}挡`, to: '1挡' })
      ;(newSeats as Record<string, number>)[key] = 1
    } else if (action === 'heating_off') {
      const key = seat === 'driver' ? 'driverHeating' : 'passengerHeating'
      changes.push({ field: `${label}座椅加热`, from: `${newSeats[key]}挡`, to: '关闭' })
      ;(newSeats as Record<string, number>)[key] = 0
    } else if (action === 'set_heating_level' && typeof params.level === 'number') {
      const key = seat === 'driver' ? 'driverHeating' : 'passengerHeating'
      changes.push({ field: `${label}座椅加热`, from: `${newSeats[key]}挡`, to: `${params.level}挡` })
      ;(newSeats as Record<string, number>)[key] = params.level
    } else if (action === 'ventilation_on') {
      const key = seat === 'driver' ? 'driverVentilation' : 'passengerVentilation'
      changes.push({ field: `${label}座椅通风`, from: `${newSeats[key]}挡`, to: '1挡' })
      ;(newSeats as Record<string, number>)[key] = 1
    } else if (action === 'ventilation_off') {
      const key = seat === 'driver' ? 'driverVentilation' : 'passengerVentilation'
      changes.push({ field: `${label}座椅通风`, from: `${newSeats[key]}挡`, to: '关闭' })
      ;(newSeats as Record<string, number>)[key] = 0
    } else if (action === 'set_ventilation_level' && typeof params.level === 'number') {
      const key = seat === 'driver' ? 'driverVentilation' : 'passengerVentilation'
      changes.push({ field: `${label}座椅通风`, from: `${newSeats[key]}挡`, to: `${params.level}挡` })
      ;(newSeats as Record<string, number>)[key] = params.level
    }

    this.state = { ...this.state, seats: newSeats }
    return changes
  }

  private handleLight(params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const changes: StateChange[] = []
    const lightType = params.light_type as string
    const action = params.action as string

    if (lightType === 'ambient') {
      if (action === 'turn_on') {
        changes.push({ field: '氛围灯', from: '关闭', to: '开启' })
        this.state = { ...this.state, lights: { ...this.state.lights, ambientOn: true } }
      } else if (action === 'turn_off') {
        changes.push({ field: '氛围灯', from: '开启', to: '关闭' })
        this.state = { ...this.state, lights: { ...this.state.lights, ambientOn: false } }
      } else if (action === 'set_color' && typeof params.color === 'string') {
        changes.push({ field: '氛围灯颜色', from: this.state.lights.ambientColor, to: params.color })
        this.state = { ...this.state, lights: { ...this.state.lights, ambientOn: true, ambientColor: params.color } }
      }
    } else if (lightType === 'reading') {
      if (action === 'turn_on') {
        changes.push({ field: '阅读灯', from: '关闭', to: '开启' })
        this.state = { ...this.state, lights: { ...this.state.lights, readingOn: true } }
      } else if (action === 'turn_off') {
        changes.push({ field: '阅读灯', from: '开启', to: '关闭' })
        this.state = { ...this.state, lights: { ...this.state.lights, readingOn: false } }
      }
    }

    return changes
  }

  private handleTrunk(params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const action = params.action as string
    const isOpen = action === 'open'
    const changes: StateChange[] = [
      { field: '后备箱', from: this.state.trunk.isOpen ? '打开' : '关闭', to: isOpen ? '打开' : '关闭' },
    ]
    this.state = { ...this.state, trunk: { isOpen } }
    return changes
  }

  private handleWiper(params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const changes: StateChange[] = []
    const action = params.action as string

    if (action === 'turn_on') {
      changes.push({ field: '雨刮器', from: '关闭', to: `开启(${WIPER_SPEED_MAP[this.state.wiper.speed]})` })
      this.state = { ...this.state, wiper: { ...this.state.wiper, isOn: true } }
    } else if (action === 'turn_off') {
      changes.push({ field: '雨刮器', from: '开启', to: '关闭' })
      this.state = { ...this.state, wiper: { ...this.state.wiper, isOn: false } }
    } else if (action === 'set_speed' && typeof params.speed === 'string') {
      changes.push({ field: '雨刮速度', from: WIPER_SPEED_MAP[this.state.wiper.speed] ?? this.state.wiper.speed, to: WIPER_SPEED_MAP[params.speed] ?? params.speed })
      this.state = { ...this.state, wiper: { isOn: true, speed: params.speed as VehicleState['wiper']['speed'] } }
    }

    return changes
  }

  private handleMusic(params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const changes: StateChange[] = []
    const action = params.action as string

    if (action === 'play') {
      changes.push({ field: '音乐', from: '暂停', to: '播放' })
      this.state = { ...this.state, music: { ...this.state.music, isPlaying: true } }
    } else if (action === 'pause') {
      changes.push({ field: '音乐', from: '播放', to: '暂停' })
      this.state = { ...this.state, music: { ...this.state.music, isPlaying: false } }
    } else if (action === 'search_and_play' && typeof params.query === 'string') {
      changes.push({ field: '音乐', from: this.state.music.track || '无', to: `搜索并播放: ${params.query}` })
      this.state = { ...this.state, music: { ...this.state.music, isPlaying: true, track: params.query } }
    } else if (action === 'next') {
      changes.push({ field: '音乐', from: '当前曲目', to: '下一首' })
    } else if (action === 'previous') {
      changes.push({ field: '音乐', from: '当前曲目', to: '上一首' })
    } else if (action === 'set_volume' && typeof params.volume === 'number') {
      changes.push({ field: '音量', from: `${this.state.music.volume}%`, to: `${params.volume}%` })
      this.state = { ...this.state, music: { ...this.state.music, volume: params.volume } }
    } else if (action === 'set_play_mode' && typeof params.play_mode === 'string') {
      changes.push({ field: '播放模式', from: MUSIC_MODE_MAP[this.state.music.mode] ?? this.state.music.mode, to: MUSIC_MODE_MAP[params.play_mode] ?? params.play_mode })
      this.state = { ...this.state, music: { ...this.state.music, mode: params.play_mode as VehicleState['music']['mode'] } }
    }

    return changes
  }

  private handleNavigation(params: Record<string, unknown>): ReadonlyArray<StateChange> {
    const changes: StateChange[] = []
    const action = params.action as string

    if (action === 'set_destination' && typeof params.destination === 'string') {
      changes.push({ field: '导航目的地', from: this.state.navigation.destination || '无', to: params.destination })
      this.state = { ...this.state, navigation: { ...this.state.navigation, isActive: true, destination: params.destination } }
    } else if (action === 'set_route_preference' && typeof params.route_preference === 'string') {
      changes.push({ field: '路线偏好', from: ROUTE_PREFERENCE_MAP[this.state.navigation.routePreference] ?? '', to: ROUTE_PREFERENCE_MAP[params.route_preference] ?? params.route_preference })
      this.state = { ...this.state, navigation: { ...this.state.navigation, routePreference: params.route_preference as VehicleState['navigation']['routePreference'] } }
    } else if (action === 'cancel') {
      changes.push({ field: '导航', from: '导航中', to: '已取消' })
      this.state = { ...this.state, navigation: { isActive: false, destination: '', routePreference: this.state.navigation.routePreference } }
    }

    return changes
  }
}
