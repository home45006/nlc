<script setup lang="ts">
import { computed } from 'vue'
import { useVehicleStore } from '../../stores/vehicleStore'

const vehicleStore = useVehicleStore()

const seatStatus = computed(() => {
  const driverHeating = vehicleStore.state.seats.driverHeating
  const driverVentilation = vehicleStore.state.seats.driverVentilation
  const passengerHeating = vehicleStore.state.seats.passengerHeating
  const passengerVentilation = vehicleStore.state.seats.passengerVentilation

  return {
    driver: {
      heating: driverHeating,
      ventilation: driverVentilation,
      hasFeature: driverHeating > 0 || driverVentilation > 0,
    },
    passenger: {
      heating: passengerHeating,
      ventilation: passengerVentilation,
      hasFeature: passengerHeating > 0 || passengerVentilation > 0,
    },
  }
})

const anyActive = computed(() =>
  seatStatus.value.driver.hasFeature || seatStatus.value.passenger.hasFeature
)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 card-hover">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="anyActive ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-700'"
        >
          <svg
            class="w-5 h-5"
            :class="anyActive ? 'text-orange-500' : 'text-gray-400'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <span class="font-medium text-gray-800 dark:text-white">座椅</span>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="anyActive ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
      >
        {{ anyActive ? '调节中' : '无调节' }}
      </span>
    </div>

    <div class="space-y-2 text-sm">
      <!-- 主驾座椅 -->
      <div class="flex justify-between items-center text-gray-600 dark:text-gray-300">
        <span>主驾</span>
        <div class="flex space-x-2">
          <span
            v-if="seatStatus.driver.heating > 0"
            class="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          >
            加热 {{ seatStatus.driver.heating }}档
          </span>
          <span
            v-if="seatStatus.driver.ventilation > 0"
            class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          >
            通风 {{ seatStatus.driver.ventilation }}档
          </span>
          <span
            v-if="!seatStatus.driver.hasFeature"
            class="text-gray-400"
          >
            -
          </span>
        </div>
      </div>

      <!-- 副驾座椅 -->
      <div class="flex justify-between items-center text-gray-600 dark:text-gray-300">
        <span>副驾</span>
        <div class="flex space-x-2">
          <span
            v-if="seatStatus.passenger.heating > 0"
            class="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          >
            加热 {{ seatStatus.passenger.heating }}档
          </span>
          <span
            v-if="seatStatus.passenger.ventilation > 0"
            class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          >
            通风 {{ seatStatus.passenger.ventilation }}档
          </span>
          <span
            v-if="!seatStatus.passenger.hasFeature"
            class="text-gray-400"
          >
            -
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
