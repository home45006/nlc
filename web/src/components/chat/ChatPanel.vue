<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChatStore } from '../../stores/chatStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import MessageList from './MessageList.vue'
import InputBar from './InputBar.vue'

const chatStore = useChatStore()
const { isConnected, connectionError, sendMessage: wsSendMessage } = useWebSocket()

const messageListRef = ref<HTMLElement | null>(null)
const inputValue = ref('')

// 监听消息变化，自动滚动到底部
watch(
  () => chatStore.messageCount,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  }
)

function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

function handleSend() {
  const text = inputValue.value.trim()
  if (!text || chatStore.isProcessing) return

  inputValue.value = ''
  wsSendMessage(text)
}
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- 连接状态提示 -->
    <div
      v-if="!isConnected || connectionError"
      class="px-4 py-2 text-sm text-center"
      :class="connectionError ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'"
    >
      <span v-if="connectionError">{{ connectionError }}</span>
      <span v-else>正在连接...</span>
    </div>

    <!-- 消息列表 -->
    <div ref="messageListRef" class="flex-1 overflow-y-auto">
      <MessageList />
    </div>

    <!-- 输入区域 -->
    <InputBar v-model="inputValue" :disabled="!isConnected || chatStore.isProcessing" @send="handleSend" />
  </div>
</template>
