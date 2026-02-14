<script setup lang="ts">
import { computed } from 'vue'
import { useVehicleStore } from '../../stores/vehicleStore'

const vehicleStore = useVehicleStore()

const positionLabels: Record<string, string> = {
  frontLeft: '主驾',
  frontRight: '副驾',
  rearLeft: '左后',
  rearRight: '右后',
}

const windows = computed(() => [
  { key: 'frontLeft', label: positionLabels.frontLeft, value: vehicleStore.state.windows.frontLeft },
  { key: 'frontRight', label: positionLabels.frontRight, value: vehicleStore.state.windows.frontRight },
  { key: 'rearLeft', label: positionLabels.rearLeft, value: vehicleStore.state.windows.rearLeft },
  { key: 'rearRight', label: positionLabels.rearRight, value: vehicleStore.state.windows.rearRight },
])

const allClosed = computed(() =>
  vehicleStore.state.windows.frontLeft === 0 &&
  vehicleStore.state.windows.frontRight === 0 &&
  vehicleStore.state.windows.rearLeft === 0 &&
  vehicleStore.state.windows.rearRight === 0
)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 card-hover">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="!allClosed ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'"
        >
          <svg
            class="w-5 h-5"
            :class="!allClosed ? 'text-blue-500' : 'text-gray-400'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </div>
        <span class="font-medium text-gray-800 dark:text-white">车窗</span>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="allClosed ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'"
      >
        {{ allClosed ? '全部关闭' : '有车窗开启' }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-2 text-sm">
      <div
        v-for="window in windows"
        :key="window.key"
        class="flex justify-between text-gray-600 dark:text-gray-300 px-2 py-1 rounded bg-gray-50 dark:bg-gray-700/50"
      >
        <span>{{ window.label }}</span>
        <span class="font-medium">{{ window.value }}%</span>
      </div>
    </div>
  </div>
</template>
