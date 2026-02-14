<script setup lang="ts">
import { useVehicleStore } from '../../stores/vehicleStore'
import ACControl from './ACControl.vue'
import WindowControl from './WindowControl.vue'
import SeatControl from './SeatControl.vue'
import LightControl from './LightControl.vue'
import MusicControl from './MusicControl.vue'
import NavigationControl from './NavigationControl.vue'
import BatteryIndicator from './BatteryIndicator.vue'

const vehicleStore = useVehicleStore()
</script>

<template>
  <div class="h-full flex flex-col space-y-4 overflow-y-auto">
    <!-- 车辆俯视图 SVG -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">车辆状态</h3>
      <div class="relative aspect-[16/10] max-h-48">
        <!-- 车辆 SVG -->
        <svg viewBox="0 0 200 120" class="w-full h-full vehicle-svg">
          <!-- 车身轮廓 -->
          <path
            d="M30 40 Q30 20 50 20 H150 Q170 20 170 40 V80 Q170 100 150 100 H50 Q30 100 30 80 Z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="text-gray-300 dark:text-gray-600"
          />

          <!-- 车窗 -->
          <!-- 前左 -->
          <rect
            x="40" y="30" width="50" height="25"
            :fill="vehicleStore.state.windows.frontLeft > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(156, 163, 175, 0.3)'"
            stroke="currentColor"
            stroke-width="1"
            class="text-gray-400 dark:text-gray-500 window"
          />
          <!-- 前右 -->
          <rect
            x="110" y="30" width="50" height="25"
            :fill="vehicleStore.state.windows.frontRight > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(156, 163, 175, 0.3)'"
            stroke="currentColor"
            stroke-width="1"
            class="text-gray-400 dark:text-gray-500 window"
          />
          <!-- 后左 -->
          <rect
            x="40" y="65" width="50" height="25"
            :fill="vehicleStore.state.windows.rearLeft > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(156, 163, 175, 0.3)'"
            stroke="currentColor"
            stroke-width="1"
            class="text-gray-400 dark:text-gray-500 window"
          />
          <!-- 后右 -->
          <rect
            x="110" y="65" width="50" height="25"
            :fill="vehicleStore.state.windows.rearRight > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(156, 163, 175, 0.3)'"
            stroke="currentColor"
            stroke-width="1"
            class="text-gray-400 dark:text-gray-500 window"
          />

          <!-- 座椅 -->
          <!-- 主驾 -->
          <rect x="45" y="35" width="20" height="15" rx="2" fill="currentColor" class="text-gray-600 dark:text-gray-400" />
          <!-- 副驾 -->
          <rect x="135" y="35" width="20" height="15" rx="2" fill="currentColor" class="text-gray-600 dark:text-gray-400" />

          <!-- 方向盘 -->
          <circle cx="55" cy="50" r="8" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-500 dark:text-gray-500" />

          <!-- 氛围灯 -->
          <g v-if="vehicleStore.state.lights.ambientOn" class="light">
            <line x1="35" y1="60" x2="35" y2="90" :stroke="vehicleStore.state.lights.ambientColor" stroke-width="2" opacity="0.8" />
            <line x1="165" y1="60" x2="165" y2="90" :stroke="vehicleStore.state.lights.ambientColor" stroke-width="2" opacity="0.8" />
          </g>

          <!-- 前进方向指示 -->
          <path d="M100 10 L100 5 M95 10 L100 5 L105 10" stroke="currentColor" stroke-width="1.5" class="text-blue-500" fill="none" />
        </svg>

        <!-- 窗户开度标注 -->
        <div class="absolute top-8 left-12 text-xs text-gray-500 dark:text-gray-400">
          {{ vehicleStore.state.windows.frontLeft }}%
        </div>
        <div class="absolute top-8 right-12 text-xs text-gray-500 dark:text-gray-400">
          {{ vehicleStore.state.windows.frontRight }}%
        </div>
        <div class="absolute bottom-8 left-12 text-xs text-gray-500 dark:text-gray-400">
          {{ vehicleStore.state.windows.rearLeft }}%
        </div>
        <div class="absolute bottom-8 right-12 text-xs text-gray-500 dark:text-gray-400">
          {{ vehicleStore.state.windows.rearRight }}%
        </div>
      </div>
    </div>

    <!-- 状态卡片网格 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
      <BatteryIndicator />
      <ACControl />
      <WindowControl />
      <SeatControl />
      <LightControl />
      <MusicControl />
      <NavigationControl />
    </div>
  </div>
</template>
