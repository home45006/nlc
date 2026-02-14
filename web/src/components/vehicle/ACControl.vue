<script setup lang="ts">
import { computed } from 'vue'
import { useVehicleStore } from '../../stores/vehicleStore'

const vehicleStore = useVehicleStore()

const modeLabels: Record<string, string> = {
  cool: '制冷',
  heat: '制热',
  auto: '自动',
  ventilation: '通风',
}

const modeLabel = computed(() => modeLabels[vehicleStore.state.ac.mode] || vehicleStore.state.ac.mode)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 card-hover">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="vehicleStore.state.ac.isOn ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'"
        >
          <svg
            class="w-5 h-5"
            :class="vehicleStore.state.ac.isOn ? 'text-blue-500' : 'text-gray-400'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span class="font-medium text-gray-800 dark:text-white">空调</span>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="vehicleStore.state.ac.isOn ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
      >
        {{ vehicleStore.state.ac.isOn ? '开启' : '关闭' }}
      </span>
    </div>

    <div class="space-y-2 text-sm">
      <div class="flex justify-between text-gray-600 dark:text-gray-300">
        <span>温度</span>
        <span class="font-medium">{{ vehicleStore.state.ac.temperature }}°C</span>
      </div>
      <div class="flex justify-between text-gray-600 dark:text-gray-300">
        <span>模式</span>
        <span class="font-medium">{{ modeLabel }}</span>
      </div>
      <div class="flex justify-between text-gray-600 dark:text-gray-300">
        <span>风速</span>
        <span class="font-medium">{{ vehicleStore.state.ac.fanSpeed }} 档</span>
      </div>
    </div>
  </div>
</template>
