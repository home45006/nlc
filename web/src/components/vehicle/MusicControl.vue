<script setup lang="ts">
import { computed } from 'vue'
import { useVehicleStore } from '../../stores/vehicleStore'

const vehicleStore = useVehicleStore()

const modeLabels: Record<string, string> = {
  sequential: '顺序播放',
  shuffle: '随机播放',
  repeat_one: '单曲循环',
}

const modeLabel = computed(() => modeLabels[vehicleStore.state.music.mode] || vehicleStore.state.music.mode)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 card-hover">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="vehicleStore.state.music.isPlaying ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-700'"
        >
          <svg
            class="w-5 h-5"
            :class="vehicleStore.state.music.isPlaying ? 'text-purple-500' : 'text-gray-400'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <span class="font-medium text-gray-800 dark:text-white">音乐</span>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="vehicleStore.state.music.isPlaying ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
      >
        {{ vehicleStore.state.music.isPlaying ? '播放中' : '暂停' }}
      </span>
    </div>

    <div class="space-y-2 text-sm">
      <!-- 当前曲目 -->
      <div class="flex justify-between text-gray-600 dark:text-gray-300">
        <span>曲目</span>
        <span class="font-medium truncate max-w-[60%]">
          {{ vehicleStore.state.music.track || '-' }}
        </span>
      </div>

      <!-- 音量 -->
      <div class="flex justify-between items-center text-gray-600 dark:text-gray-300">
        <span>音量</span>
        <div class="flex items-center space-x-2">
          <div class="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              class="h-full bg-purple-500 rounded-full transition-all"
              :style="{ width: `${vehicleStore.state.music.volume}%` }"
            ></div>
          </div>
          <span class="font-medium w-8 text-right">{{ vehicleStore.state.music.volume }}%</span>
        </div>
      </div>

      <!-- 播放模式 -->
      <div class="flex justify-between text-gray-600 dark:text-gray-300">
        <span>模式</span>
        <span class="font-medium">{{ modeLabel }}</span>
      </div>
    </div>
  </div>
</template>
