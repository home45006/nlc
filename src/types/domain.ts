export const Domain = {
  VEHICLE_CONTROL: 'vehicle_control',
  MUSIC: 'music',
  NAVIGATION: 'navigation',
  CHAT: 'chat',
} as const

export type DomainType = (typeof Domain)[keyof typeof Domain]

export const VehicleControlIntent = {
  AC_TOGGLE: 'ac_toggle',
  AC_SET_TEMPERATURE: 'ac_set_temperature',
  AC_SET_MODE: 'ac_set_mode',
  AC_SET_FAN_SPEED: 'ac_set_fan_speed',
  WINDOW_CONTROL: 'window_control',
  SEAT_HEATING: 'seat_heating',
  SEAT_VENTILATION: 'seat_ventilation',
  LIGHT_CONTROL: 'light_control',
  TRUNK_TOGGLE: 'trunk_toggle',
  WIPER_CONTROL: 'wiper_control',
} as const

export const MusicIntent = {
  PLAY: 'play',
  PAUSE: 'pause',
  NEXT: 'next',
  PREVIOUS: 'previous',
  SEARCH_AND_PLAY: 'search_and_play',
  SET_VOLUME: 'set_volume',
  SET_PLAY_MODE: 'set_play_mode',
} as const

export const NavigationIntent = {
  SET_DESTINATION: 'set_destination',
  SET_ROUTE_PREFERENCE: 'set_route_preference',
  CANCEL: 'cancel_navigation',
} as const
