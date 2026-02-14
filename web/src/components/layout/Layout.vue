<script setup lang="ts">
import Header from './Header.vue'
import ChatPanel from '../chat/ChatPanel.vue'
import VehicleOverview from '../vehicle/VehicleOverview.vue'
import { useWebSocket } from '../../hooks/useWebSocket'

const { clearContext } = useWebSocket()

function handleClearContext() {
  clearContext()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    <Header @clear-context="handleClearContext" />

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-4">
      <!-- 左侧：车辆状态 -->
      <aside class="w-full md:w-1/2 lg:w-2/5 order-2 md:order-1">
        <VehicleOverview />
      </aside>

      <!-- 右侧：对话面板 -->
      <section class="w-full md:w-1/2 lg:w-3/5 order-1 md:order-2">
        <ChatPanel />
      </section>
    </main>

    <!-- 移动端底部安全区域 -->
    <div class="h-safe-area-bottom md:hidden"></div>
  </div>
</template>
