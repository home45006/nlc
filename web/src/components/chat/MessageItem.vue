<script setup lang="ts">
import type { DisplayMessage } from '../../stores/chatStore'

defineProps<{
  message: DisplayMessage
}>()

// Domain 中文映射
const domainLabels: Record<string, string> = {
  vehicle_control: '车辆控制',
  music: '音乐',
  navigation: '导航',
  chat: '通用对话',
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

        <!-- 改写结果 -->
        <div
          v-if="!message.isProcessing && message.routings && message.routings.length > 1"
          class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm"
        >
          <div class="text-gray-500 dark:text-gray-400 mb-2">
            输入: "{{ message.originalInput }}"
          </div>
          <div class="text-gray-600 dark:text-gray-300 mb-1">改写结果:</div>
          <div
            v-for="(routing, index) in message.routings"
            :key="index"
            class="flex items-center space-x-2 py-1"
          >
            <span class="text-gray-400">{{ index + 1 }}.</span>
            <span class="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs">
              {{ domainLabels[routing.domain] || routing.domain }}
            </span>
            <span class="text-gray-700 dark:text-gray-300">{{ routing.rewrittenQuery }}</span>
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
