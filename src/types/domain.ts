export const Domain = {
  VEHICLE_CONTROL: 'vehicle_control',
  MUSIC: 'music',
  NAVIGATION: 'navigation',
  CHAT: 'chat',
} as const

export type DomainType = (typeof Domain)[keyof typeof Domain]

// 注意: VehicleControlIntent, MusicIntent, NavigationIntent 已删除
// 系统现在使用 Skill 架构进行意图识别，不再使用硬编码的意图常量
