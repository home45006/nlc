<script setup lang="ts">
import { useChatStore } from '../../stores/chatStore'
import MessageItem from './MessageItem.vue'

const chatStore = useChatStore()
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 欢迎消息 -->
    <div v-if="chatStore.messageCount === 0" class="text-center py-12">
      <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-800 dark:text-white mb-2">
        欢迎使用智能座舱控制系统
      </h3>
      <p class="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
        您可以用自然语言控制车辆的各项功能，例如：
      </p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
          打开空调
        </span>
        <span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
          把温度调到24度
        </span>
        <span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
          导航到北京
        </span>
        <span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
          播放周杰伦的歌
        </span>
      </div>
    </div>

    <!-- 消息列表 -->
    <TransitionGroup name="message">
      <MessageItem
        v-for="message in chatStore.displayMessages"
        :key="message.id"
        :message="message"
      />
    </TransitionGroup>
  </div>
</template>
