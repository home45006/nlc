<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': []
}>()

const inputRef = ref<HTMLTextAreaElement | null>(null)

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)

  // 自动调整高度
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 120) + 'px'
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    emit('send')
  }
}

function handleSend() {
  if (props.modelValue.trim() && !props.disabled) {
    emit('send')
    // 重置输入框高度
    if (inputRef.value) {
      inputRef.value.style.height = 'auto'
    }
  }
}
</script>

<template>
  <div class="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 safe-area-bottom">
    <div class="flex items-end gap-2 max-w-3xl mx-auto">
      <!-- 输入框 -->
      <div class="flex-1 relative">
        <textarea
          ref="inputRef"
          :value="modelValue"
          :disabled="disabled"
          placeholder="输入指令或问题..."
          rows="1"
          class="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          @input="handleInput"
          @keydown="handleKeydown"
        />
      </div>

      <!-- 发送按钮 -->
      <button
        :disabled="disabled || !modelValue.trim()"
        class="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="handleSend"
      >
        <svg v-if="!disabled" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </button>
    </div>

    <!-- 提示 -->
    <p class="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
      按 Enter 发送，Shift + Enter 换行
    </p>
  </div>
</template>
