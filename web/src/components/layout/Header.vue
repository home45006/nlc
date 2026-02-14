<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatStore } from '../../stores/chatStore'
import { api } from '../../services/api'
import type { ModelType } from '../../types'

const chatStore = useChatStore()
const isDark = ref(false)
const showModelMenu = ref(false)

// 切换暗色模式
function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('darkMode', isDark.value.toString())
}

// 切换模型
async function switchModel(model: ModelType) {
  const result = await api.switchModel(model)
  if (result.success && result.data) {
    chatStore.setModel(model)
  }
  showModelMenu.value = false
}

// 重置状态
async function handleReset() {
  if (confirm('确定要重置所有状态吗？这将清除对话历史。')) {
    await api.resetState()
    await api.clearHistory()
    chatStore.clearMessages()
    window.location.reload()
  }
}

// 初始化暗色模式
onMounted(() => {
  const savedDark = localStorage.getItem('darkMode')
  if (savedDark === 'true') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})
</script>

<template>
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <!-- Logo -->
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 class="text-lg font-semibold text-gray-800 dark:text-white">
          智能座舱控制系统
        </h1>
      </div>

      <!-- 控制按钮 -->
      <div class="flex items-center space-x-2">
        <!-- 模型选择 -->
        <div class="relative">
          <button
            @click="showModelMenu = !showModelMenu"
            class="flex items-center space-x-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{{ chatStore.currentModel === 'gemini' ? 'Gemini' : 'GLM' }}</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- 下拉菜单 -->
          <div
            v-if="showModelMenu"
            class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
          >
            <button
              @click="switchModel('gemini')"
              class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="chatStore.currentModel === 'gemini' ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'"
            >
              Gemini
            </button>
            <button
              @click="switchModel('glm')"
              class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="chatStore.currentModel === 'glm' ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'"
            >
              GLM (智谱)
            </button>
          </div>
        </div>

        <!-- 重置按钮 -->
        <button
          @click="handleReset"
          class="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="重置"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <!-- 暗色模式切换 -->
        <button
          @click="toggleDark"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="切换主题"
        >
          <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
