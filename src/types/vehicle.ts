export interface VehicleState {
  readonly ac: {
    readonly isOn: boolean
    readonly temperature: number
    readonly mode: 'cool' | 'heat' | 'auto' | 'ventilation'
    readonly fanSpeed: number
  }
  readonly windows: {
    readonly frontLeft: number
    readonly frontRight: number
    readonly rearLeft: number
    readonly rearRight: number
  }
  readonly seats: {
    readonly driverHeating: number
    readonly driverVentilation: number
    readonly passengerHeating: number
    readonly passengerVentilation: number
  }
  readonly lights: {
    readonly ambientOn: boolean
    readonly ambientColor: string
    readonly readingOn: boolean
  }
  readonly trunk: {
    readonly isOpen: boolean
  }
  readonly wiper: {
    readonly isOn: boolean
    readonly speed: 'low' | 'medium' | 'high'
  }
  readonly music: {
    readonly isPlaying: boolean
    readonly track: string
    readonly volume: number
    readonly mode: 'sequential' | 'shuffle' | 'repeat_one'
  }
  readonly navigation: {
    readonly isActive: boolean
    readonly destination: string
    readonly routePreference: 'fastest' | 'shortest' | 'no_highway'
  }
  readonly battery: {
    readonly level: number
    readonly rangeKm: number
  }
}

export function createDefaultVehicleState(): VehicleState {
  return {
    ac: { isOn: false, temperature: 26, mode: 'auto', fanSpeed: 3 },
    windows: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
    seats: { driverHeating: 0, driverVentilation: 0, passengerHeating: 0, passengerVentilation: 0 },
    lights: { ambientOn: false, ambientColor: '#FFFFFF', readingOn: false },
    trunk: { isOpen: false },
    wiper: { isOn: false, speed: 'low' },
    music: { isPlaying: false, track: '', volume: 50, mode: 'sequential' },
    navigation: { isActive: false, destination: '', routePreference: 'fastest' },
    battery: { level: 78, rangeKm: 320 },
  }
}
