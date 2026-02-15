/**
 * 导航意图解析器
 */

import type { Command, IntentResult } from '../../core/types.js'
import { Domain } from '../../types/domain.js'

export type NavigationIntent =
  | 'set_destination'
  | 'set_route_preference'
  | 'cancel'
  | 'unknown'

export function parseIntentToCommands(result: IntentResult): Command[] {
  const intent = result.intent as NavigationIntent
  const slots = result.slots

  switch (intent) {
    case 'set_destination':
      return [{
        type: 'control_navigation',
        params: { action: 'set_destination', destination: slots.destination || '' },
        domain: Domain.NAVIGATION,
        priority: 1,
      }]

    case 'set_route_preference':
      return [{
        type: 'control_navigation',
        params: { action: 'set_route_preference', route_preference: slots.route_preference },
        domain: Domain.NAVIGATION,
        priority: 1,
      }]

    case 'cancel':
      return [{
        type: 'control_navigation',
        params: { action: 'cancel' },
        domain: Domain.NAVIGATION,
        priority: 1,
      }]

    default:
      return []
  }
}

export function generateTtsText(intent: NavigationIntent, slots: Record<string, unknown>): string {
  switch (intent) {
    case 'set_destination':
      return `好的，正在为您导航到 ${slots.destination}`
    case 'set_route_preference':
      return `好的，已切换为${getRoutePreferenceText(slots.route_preference as string)}`
    case 'cancel':
      return '好的，已取消导航'
    default:
      return '好的'
  }
}

function getRoutePreferenceText(preference: string): string {
  const preferenceMap: Record<string, string> = {
    fastest: '最快路线',
    shortest: '最短路线',
    no_highway: '不走高速',
  }
  return preferenceMap[preference] || preference
}
