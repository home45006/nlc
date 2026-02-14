/**
 * 模式映射常量 - 用于将内部枚举值转换为中文显示
 */
export const AC_MODE_MAP: Record<string, string> = {
  cool: '制冷',
  heat: '制热',
  auto: '自动',
  ventilation: '通风',
}

export const MUSIC_MODE_MAP: Record<string, string> = {
  sequential: '顺序播放',
  shuffle: '随机播放',
  repeat_one: '单曲循环',
}

export const ROUTE_PREFERENCE_MAP: Record<string, string> = {
  fastest: '最快',
  shortest: '最短',
  no_highway: '不走高速',
}

export const WIPER_SPEED_MAP: Record<string, string> = {
  low: '低速',
  medium: '中速',
  high: '高速',
}

/**
 * 合并所有模式映射，用于通用查找
 */
export const MODE_MAP: Record<string, string> = {
  ...AC_MODE_MAP,
  ...MUSIC_MODE_MAP,
  ...ROUTE_PREFERENCE_MAP,
  ...WIPER_SPEED_MAP,
}
