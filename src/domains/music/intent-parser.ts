/**
 * 音乐意图解析器
 */

import type { Command, IntentResult } from '../../core/types.js'
import { Domain } from '../../types/domain.js'

export type MusicIntent =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'search_and_play'
  | 'set_volume'
  | 'set_play_mode'
  | 'unknown'

export function parseIntentToCommands(result: IntentResult): Command[] {
  const intent = result.intent as MusicIntent
  const slots = result.slots

  switch (intent) {
    case 'play':
    case 'pause':
    case 'next':
    case 'previous':
      return [{
        type: 'control_music',
        params: { action: intent },
        domain: Domain.MUSIC,
        priority: 1,
      }]

    case 'search_and_play':
      return [{
        type: 'control_music',
        params: { action: 'search_and_play', query: slots.query || '' },
        domain: Domain.MUSIC,
        priority: 1,
      }]

    case 'set_volume':
      return [{
        type: 'control_music',
        params: { action: 'set_volume', volume: slots.volume },
        domain: Domain.MUSIC,
        priority: 1,
      }]

    case 'set_play_mode':
      return [{
        type: 'control_music',
        params: { action: 'set_play_mode', play_mode: slots.play_mode },
        domain: Domain.MUSIC,
        priority: 1,
      }]

    default:
      return []
  }
}

export function generateTtsText(intent: MusicIntent, slots: Record<string, unknown>): string {
  switch (intent) {
    case 'play':
      return '好的，开始播放音乐'
    case 'pause':
      return '好的，已暂停播放'
    case 'next':
      return '好的，播放下一首'
    case 'previous':
      return '好的，播放上一首'
    case 'search_and_play':
      return `好的，正在为您搜索播放 ${slots.query || '音乐'}`
    case 'set_volume':
      return `好的，已将音量调整为 ${slots.volume}%`
    case 'set_play_mode':
      return `好的，已切换为${getPlayModeText(slots.play_mode as string)}模式`
    default:
      return '好的'
  }
}

function getPlayModeText(mode: string): string {
  const modeMap: Record<string, string> = {
    sequential: '顺序播放',
    shuffle: '随机播放',
    repeat_one: '单曲循环',
  }
  return modeMap[mode] || mode
}
