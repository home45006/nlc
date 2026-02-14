<script setup lang="ts">
import type { DisplayMessage } from '../../stores/chatStore'

defineProps<{
  message: DisplayMessage
}>()
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
