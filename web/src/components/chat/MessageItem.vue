<script setup lang="ts">
import { ref } from 'vue'
import type { DisplayMessage } from '../../stores/chatStore'

defineProps<{
  message: DisplayMessage
}>()

const showDetails = ref(false)

// Domain 中文映射
const domainLabels: Record<string, string> = {
  vehicle_control: '车辆控制',
  music: '音乐',
  navigation: '导航',
  general: '通用对话',
}

function formatSlots(slots: Record<string, unknown>): string {
  return JSON.stringify(slots, null, 2)
}
</script>

<template>
  <div
    class="flex"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] md:max-w-[70%]"
      :class="message.role === 'user' ? 'order-1' : 'order-2'"
    >
      <!-- 用户消息 -->
      <div
        v-if="message.role === 'user'"
        class="bg-blue-500 text-white px-4 py-2 rounded-2xl rounded-tr-sm"
      >
        {{ message.content }}
      </div>

      <!-- 助手消息 -->
      <div
        v-else-if="message.role === 'assistant'"
        class="space-y-2"
      >
        <!-- 处理中动画 -->
        <div
          v-if="message.isProcessing"
          class="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm"
        >
          <div class="typing-indicator flex space-x-1">
            <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
          </div>
        </div>

        <!-- 正常消息 -->
        <div v-else class="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-2xl rounded-tl-sm text-gray-800 dark:text-gray-200">
          {{ message.content }}
        </div>

        <!-- 结构化识别结果 -->
        <div
          v-if="!message.isProcessing && (message.domain || message.intent)"
          class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs"
        >
          <div
            class="flex items-center justify-between cursor-pointer"
            @click="showDetails = !showDetails"
          >
            <div class="flex items-center space-x-2">
              <span class="font-medium text-blue-700 dark:text-blue-300">
                {{ domainLabels[message.domain || ''] || message.domain }}
              </span>
              <span class="text-gray-400">|</span>
              <span class="text-gray-600 dark:text-gray-400">{{ message.intent }}</span>
              <span
                v-if="message.confidence"
                class="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              >
                {{ (message.confidence * 100).toFixed(0) }}%
              </span>
            </div>
            <svg
              class="w-4 h-4 text-gray-400 transition-transform"
              :class="showDetails ? 'rotate-180' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <!-- 展开的详细信息 -->
          <div v-if="showDetails" class="mt-2 space-y-1">
            <!-- Slots -->
            <div v-if="message.slots && Object.keys(message.slots).length > 0">
              <div class="text-gray-500 dark:text-gray-400 mb-1">参数:</div>
              <pre class="bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300">{{ formatSlots(message.slots) }}</pre>
            </div>
            <!-- Meta 信息 -->
            <div v-if="message.meta" class="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
              <span>⏱ {{ message.meta.latencyMs }}ms</span>
              <span>📝 {{ message.meta.tokens.prompt }}+{{ message.meta.tokens.completion }} tokens</span>
              <span>🤖 {{ message.meta.model }}</span>
            </div>
          </div>
        </div>

        <!-- 状态变更提示 -->
        <div
          v-if="message.stateChanges && message.stateChanges.length > 0"
          class="flex flex-wrap gap-1"
        >
          <span
            v-for="(change, index) in message.stateChanges"
            :key="index"
            class="inline-flex items-center text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ change.field }}: {{ change.from }} → {{ change.to }}
          </span>
        </div>
      </div>

      <!-- 系统消息 -->
      <div
        v-else-if="message.role === 'system'"
        class="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm text-center"
      >
        {{ message.content }}
      </div>
    </div>
  </div>
</template>
