<script setup lang="ts">
import { computed } from 'vue'
import { useVehicleStore } from '../../stores/vehicleStore'

const vehicleStore = useVehicleStore()

const batteryColor = computed(() => {
  const level = vehicleStore.state.battery.level
  if (level > 60) return 'bg-green-500'
  if (level > 30) return 'bg-yellow-500'
  return 'bg-red-500'
})

const batteryTextColor = computed(() => {
  const level = vehicleStore.state.battery.level
  if (level > 60) return 'text-green-600 dark:text-green-400'
  if (level > 30) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 card-hover">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="vehicleStore.state.battery.level > 30 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'"
        >
          <svg
            class="w-5 h-5"
            :class="vehicleStore.state.battery.level > 30 ? 'text-green-500' : 'text-red-500'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span class="font-medium text-gray-800 dark:text-white">电量</span>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="vehicleStore.state.battery.level > 30 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
      >
        {{ vehicleStore.state.battery.level > 30 ? '正常' : '低电量' }}
      </span>
    </div>

    <div class="space-y-3">
      <!-- 电量条 -->
      <div class="relative">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="batteryColor"
            :style="{ width: `${vehicleStore.state.battery.level}%` }"
          ></div>
        </div>
        <span
          class="absolute inset-0 flex items-center justify-center text-xs font-medium"
          :class="vehicleStore.state.battery.level > 50 ? 'text-white' : 'text-gray-700 dark:text-gray-300'"
        >
          {{ vehicleStore.state.battery.level }}%
        </span>
      </div>

      <!-- 续航里程 -->
      <div class="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
        <span>预计续航</span>
        <span class="font-medium" :class="batteryTextColor">
          {{ vehicleStore.state.battery.rangeKm }} km
        </span>
      </div>
    </div>
  </div>
</template>
