/**
 * 车控意图解析器
 *
 * 将模型输出的意图和槽位转换为可执行的指令
 */

import type { Command, IntentResult } from '../../core/types.js'
import { Domain } from '../../types/domain.js'

/**
 * 车控意图类型
 */
export type VehicleIntent =
  | 'ac'
  | 'window'
  | 'seat'
  | 'light'
  | 'trunk'
  | 'wiper'
  | 'unknown'

/**
 * 解析意图结果为指令
 */
export function parseIntentToCommands(result: IntentResult): Command[] {
  const intent = result.intent as VehicleIntent
  const slots = result.slots

  switch (intent) {
    case 'ac':
      return parseAcIntent(slots)
    case 'window':
      return parseWindowIntent(slots)
    case 'seat':
      return parseSeatIntent(slots)
    case 'light':
      return parseLightIntent(slots)
    case 'trunk':
      return parseTrunkIntent(slots)
    case 'wiper':
      return parseWiperIntent(slots)
    default:
      return []
  }
}

/**
 * 解析空调意图
 */
function parseAcIntent(slots: Record<string, unknown>): Command[] {
  const action = slots.action as string
  if (!action) return []

  const params: Record<string, unknown> = { action }

  // 复制其他槽位
  if (slots.temperature !== undefined) {
    params.temperature = slots.temperature
  }
  if (slots.mode !== undefined) {
    params.mode = slots.mode
  }
  if (slots.fan_speed !== undefined) {
    params.fan_speed = slots.fan_speed
  }

  return [
    {
      type: 'control_ac',
      params,
      domain: Domain.VEHICLE_CONTROL,
      priority: 1,
    },
  ]
}

/**
 * 解析车窗意图
 */
function parseWindowIntent(slots: Record<string, unknown>): Command[] {
  const action = slots.action as string
  const position = (slots.position as string) || 'all'

  if (!action) return []

  const params: Record<string, unknown> = { action, position }

  if (slots.open_percentage !== undefined) {
    params.open_percentage = slots.open_percentage
  }

  return [
    {
      type: 'control_window',
      params,
      domain: Domain.VEHICLE_CONTROL,
      priority: 1,
    },
  ]
}

/**
 * 解析座椅意图
 */
function parseSeatIntent(slots: Record<string, unknown>): Command[] {
  const action = slots.action as string
  const seat = (slots.seat as string) || 'driver'

  if (!action) return []

  const params: Record<string, unknown> = { action, seat }

  if (slots.level !== undefined) {
    params.level = slots.level
  }

  return [
    {
      type: 'control_seat',
      params,
      domain: Domain.VEHICLE_CONTROL,
      priority: 1,
    },
  ]
}

/**
 * 解析灯光意图
 */
function parseLightIntent(slots: Record<string, unknown>): Command[] {
  const action = slots.action as string
  const lightType = (slots.light_type as string) || 'ambient'

  if (!action) return []

  const params: Record<string, unknown> = { action, light_type: lightType }

  if (slots.color !== undefined) {
    params.color = slots.color
  }

  return [
    {
      type: 'control_light',
      params,
      domain: Domain.VEHICLE_CONTROL,
      priority: 1,
    },
  ]
}

/**
 * 解析后备箱意图
 */
function parseTrunkIntent(slots: Record<string, unknown>): Command[] {
  const action = slots.action as string
  if (!action) return []

  return [
    {
      type: 'control_trunk',
      params: { action },
      domain: Domain.VEHICLE_CONTROL,
      priority: 1,
    },
  ]
}

/**
 * 解析雨刮器意图
 */
function parseWiperIntent(slots: Record<string, unknown>): Command[] {
  const action = slots.action as string
  if (!action) return []

  const params: Record<string, unknown> = { action }

  if (slots.speed !== undefined) {
    params.speed = slots.speed
  }

  return [
    {
      type: 'control_wiper',
      params,
      domain: Domain.VEHICLE_CONTROL,
      priority: 1,
    },
  ]
}

/**
 * 生成 TTS 文本
 */
export function generateTtsText(intent: VehicleIntent, slots: Record<string, unknown>): string {
  switch (intent) {
    case 'ac':
      return generateAcTts(slots)
    case 'window':
      return generateWindowTts(slots)
    case 'seat':
      return generateSeatTts(slots)
    case 'light':
      return generateLightTts(slots)
    case 'trunk':
      return generateTrunkTts(slots)
    case 'wiper':
      return generateWiperTts(slots)
    default:
      return '好的'
  }
}

function generateAcTts(slots: Record<string, unknown>): string {
  const action = slots.action as string
  switch (action) {
    case 'turn_on':
      return '好的，已为您打开空调'
    case 'turn_off':
      return '好的，已为您关闭空调'
    case 'set_temperature':
      return `好的，已将空调温度设置为 ${slots.temperature} 度`
    case 'set_mode':
      return `好的，已将空调模式调整为${getModeText(slots.mode as string)}`
    case 'set_fan_speed':
      return `好的，已将风速调整为 ${slots.fan_speed} 挡`
    default:
      return '好的'
  }
}

function generateWindowTts(slots: Record<string, unknown>): string {
  const action = slots.action as string
  const position = getPositionText(slots.position as string)

  switch (action) {
    case 'open':
      return `好的，已为您打开${position}车窗`
    case 'close':
      return `好的，已为您关闭${position}车窗`
    case 'set_position':
      return `好的，已将${position}车窗调整为 ${slots.open_percentage}%`
    default:
      return '好的'
  }
}

function generateSeatTts(slots: Record<string, unknown>): string {
  const action = slots.action as string
  const seat = slots.seat === 'driver' ? '主驾' : '副驾'

  switch (action) {
    case 'heating_on':
      return `好的，已为您打开${seat}座椅加热`
    case 'heating_off':
      return `好的，已为您关闭${seat}座椅加热`
    case 'set_heating_level':
      return `好的，已将${seat}座椅加热调整为 ${slots.level} 挡`
    case 'ventilation_on':
      return `好的，已为您打开${seat}座椅通风`
    case 'ventilation_off':
      return `好的，已为您关闭${seat}座椅通风`
    case 'set_ventilation_level':
      return `好的，已将${seat}座椅通风调整为 ${slots.level} 挡`
    default:
      return '好的'
  }
}

function generateLightTts(slots: Record<string, unknown>): string {
  const action = slots.action as string
  const lightType = slots.light_type === 'ambient' ? '氛围灯' : '阅读灯'

  switch (action) {
    case 'turn_on':
      return `好的，已为您打开${lightType}`
    case 'turn_off':
      return `好的，已为您关闭${lightType}`
    case 'set_color':
      return `好的，已将氛围灯颜色调整为${slots.color}`
    default:
      return '好的'
  }
}

function generateTrunkTts(slots: Record<string, unknown>): string {
  const action = slots.action as string
  return action === 'open' ? '好的，已为您打开后备箱' : '好的，已为您关闭后备箱'
}

function generateWiperTts(slots: Record<string, unknown>): string {
  const action = slots.action as string
  switch (action) {
    case 'turn_on':
      return '好的，已为您打开雨刮器'
    case 'turn_off':
      return '好的，已为您关闭雨刮器'
    case 'set_speed':
      return `好的，已将雨刮速度调整为${getSpeedText(slots.speed as string)}`
    default:
      return '好的'
  }
}

function getModeText(mode: string): string {
  const modeMap: Record<string, string> = {
    cool: '制冷',
    heat: '制热',
    auto: '自动',
    ventilation: '通风',
  }
  return modeMap[mode] || mode
}

function getPositionText(position: string): string {
  const positionMap: Record<string, string> = {
    front_left: '主驾',
    front_right: '副驾',
    rear_left: '左后',
    rear_right: '右后',
    all: '全部',
  }
  return positionMap[position] || position
}

function getSpeedText(speed: string): string {
  const speedMap: Record<string, string> = {
    low: '低速',
    medium: '中速',
    high: '高速',
  }
  return speedMap[speed] || speed
}
