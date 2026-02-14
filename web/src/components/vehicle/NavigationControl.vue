<script setup lang="ts">
import { computed } from 'vue'
import { useVehicleStore } from '../../stores/vehicleStore'

const vehicleStore = useVehicleStore()

const preferenceLabels: Record<string, string> = {
  fastest: '最快路线',
  shortest: '最短路线',
  no_highway: '避开高速',
}

const preferenceLabel = computed(() =>
  preferenceLabels[vehicleStore.state.navigation.routePreference] || vehicleStore.state.navigation.routePreference
)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 card-hover">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="vehicleStore.state.navigation.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'"
        >
          <svg
            class="w-5 h-5"
            :class="vehicleStore.state.navigation.isActive ? 'text-green-500' : 'text-gray-400'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span class="font-medium text-gray-800 dark:text-white">导航</span>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="vehicleStore.state.navigation.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
      >
        {{ vehicleStore.state.navigation.isActive ? '导航中' : '未启用' }}
      </span>
    </div>

    <div class="space-y-2 text-sm">
      <!-- 目的地 -->
      <div class="flex justify-between text-gray-600 dark:text-gray-300">
        <span>目的地</span>
        <span class="font-medium truncate max-w-[60%]">
          {{ vehicleStore.state.navigation.destination || '-' }}
        </span>
      </div>

      <!-- 路线偏好 -->
      <div class="flex justify-between text-gray-600 dark:text-gray-300">
        <span>偏好</span>
        <span class="font-medium">{{ preferenceLabel }}</span>
      </div>
    </div>
  </div>
</template>
