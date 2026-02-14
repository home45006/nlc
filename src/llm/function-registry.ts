import type { ToolDefinition } from '../types/index.js'
import { Domain, type DomainType } from '../types/index.js'
import { vehicleFunctions } from './functions/vehicle.js'
import { musicFunctions } from './functions/music.js'
import { navigationFunctions } from './functions/navigation.js'

interface FunctionMeta {
  readonly domain: DomainType
  readonly intent: string
}

const FUNCTION_DOMAIN_MAP: Record<string, FunctionMeta> = {
  control_ac: { domain: Domain.VEHICLE_CONTROL, intent: 'ac_control' },
  control_window: { domain: Domain.VEHICLE_CONTROL, intent: 'window_control' },
  control_seat: { domain: Domain.VEHICLE_CONTROL, intent: 'seat_control' },
  control_light: { domain: Domain.VEHICLE_CONTROL, intent: 'light_control' },
  control_trunk: { domain: Domain.VEHICLE_CONTROL, intent: 'trunk_control' },
  control_wiper: { domain: Domain.VEHICLE_CONTROL, intent: 'wiper_control' },
  control_music: { domain: Domain.MUSIC, intent: 'music_control' },
  control_navigation: { domain: Domain.NAVIGATION, intent: 'navigation_control' },
}

export class FunctionRegistry {
  private readonly tools: ReadonlyArray<ToolDefinition>

  constructor() {
    this.tools = [
      ...vehicleFunctions,
      ...musicFunctions,
      ...navigationFunctions,
    ]
  }

  getAllTools(): ReadonlyArray<ToolDefinition> {
    return this.tools
  }

  resolve(functionName: string, params: Record<string, unknown>): FunctionMeta {
    const meta = FUNCTION_DOMAIN_MAP[functionName]
    if (!meta) {
      return { domain: Domain.CHAT, intent: 'unknown' }
    }

    const action = params.action as string | undefined
    const intent = action ? `${meta.intent}_${action}` : meta.intent

    return { domain: meta.domain, intent }
  }
}
