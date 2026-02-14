<script setup lang="ts">
import { computed } from 'vue'
import { useVehicleStore } from '../../stores/vehicleStore'

const vehicleStore = useVehicleStore()

const anyLightOn = computed(() =>
  vehicleStore.state.lights.ambientOn || vehicleStore.state.lights.readingOn
)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 card-hover">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="anyLightOn ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700'"
        >
          <svg
            class="w-5 h-5"
            :class="anyLightOn ? 'text-yellow-500' : 'text-gray-400'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <span class="font-medium text-gray-800 dark:text-white">灯光</span>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="anyLightOn ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
      >
        {{ anyLightOn ? '有灯光开启' : '全部关闭' }}
      </span>
    </div>

    <div class="space-y-2 text-sm">
      <!-- 氛围灯 -->
      <div class="flex justify-between items-center text-gray-600 dark:text-gray-300">
        <span>氛围灯</span>
        <div class="flex items-center space-x-2">
          <div
            v-if="vehicleStore.state.lights.ambientOn"
            class="w-4 h-4 rounded-full border-2 border-gray-300"
            :style="{ backgroundColor: vehicleStore.state.lights.ambientColor }"
          ></div>
          <span class="font-medium">
            {{ vehicleStore.state.lights.ambientOn ? vehicleStore.state.lights.ambientColor : '关闭' }}
          </span>
        </div>
      </div>

      <!-- 阅读灯 -->
      <div class="flex justify-between items-center text-gray-600 dark:text-gray-300">
        <span>阅读灯</span>
        <span
          class="font-medium"
          :class="vehicleStore.state.lights.readingOn ? 'text-yellow-600 dark:text-yellow-400' : ''"
        >
          {{ vehicleStore.state.lights.readingOn ? '开启' : '关闭' }}
        </span>
      </div>
    </div>
  </div>
</template>
