import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VehicleState } from '../types'

// 默认车辆状态
const defaultVehicleState: VehicleState = {
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

export const useVehicleStore = defineStore('vehicle', () => {
  const state = ref<VehicleState>(defaultVehicleState)

  function updateState(newState: Partial<VehicleState>) {
    state.value = { ...state.value, ...newState }
  }

  function setState(newState: VehicleState) {
    state.value = newState
  }

  function reset() {
    state.value = defaultVehicleState
  }

  // 便捷的局部状态更新方法
  function updateAC(acUpdate: Partial<VehicleState['ac']>) {
    state.value = {
      ...state.value,
      ac: { ...state.value.ac, ...acUpdate },
    }
  }

  function updateWindows(windowsUpdate: Partial<VehicleState['windows']>) {
    state.value = {
      ...state.value,
      windows: { ...state.value.windows, ...windowsUpdate },
    }
  }

  function updateSeats(seatsUpdate: Partial<VehicleState['seats']>) {
    state.value = {
      ...state.value,
      seats: { ...state.value.seats, ...seatsUpdate },
    }
  }

  function updateLights(lightsUpdate: Partial<VehicleState['lights']>) {
    state.value = {
      ...state.value,
      lights: { ...state.value.lights, ...lightsUpdate },
    }
  }

  function updateMusic(musicUpdate: Partial<VehicleState['music']>) {
    state.value = {
      ...state.value,
      music: { ...state.value.music, ...musicUpdate },
    }
  }

  function updateNavigation(navigationUpdate: Partial<VehicleState['navigation']>) {
    state.value = {
      ...state.value,
      navigation: { ...state.value.navigation, ...navigationUpdate },
    }
  }

  return {
    state,
    updateState,
    setState,
    reset,
    updateAC,
    updateWindows,
    updateSeats,
    updateLights,
    updateMusic,
    updateNavigation,
  }
})
