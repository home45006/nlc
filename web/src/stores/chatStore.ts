import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, StateChange, WSDialogPayload } from '../types'

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  stateChanges?: StateChange[]
  timestamp: number
  isProcessing?: boolean
  // 结构化识别结果
  domain?: string
  intent?: string
  slots?: Record<string, unknown>
  confidence?: number
  hasCommand?: boolean
  meta?: {
    model: string
    latencyMs: number
    tokens: { prompt: number; completion: number }
  }
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<DisplayMessage[]>([])
  const isProcessing = ref(false)
  const currentModel = ref<'gemini' | 'glm'>('gemini')

  // 对话历史（用于显示）
  const displayMessages = computed(() => messages.value)

  // 消息数量
  const messageCount = computed(() => messages.value.length)

  // 添加用户消息
  function addUserMessage(content: string) {
    const message: DisplayMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    messages.value.push(message)
  }

  // 添加助手消息
  function addAssistantMessage(output: WSDialogPayload) {
    const message: DisplayMessage = {
      id: generateId(),
      role: 'assistant',
      content: output.ttsText,
      stateChanges: output.stateChanges,
      timestamp: Date.now(),
      // 结构化识别结果
      domain: output.domain,
      intent: output.intent,
      slots: output.slots,
      confidence: output.confidence,
      hasCommand: output.hasCommand,
      meta: output.meta,
    }
    messages.value.push(message)
  }

  // 添加处理中消息
  function addProcessingMessage() {
    const message: DisplayMessage = {
      id: 'processing',
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isProcessing: true,
    }
    messages.value.push(message)
    isProcessing.value = true
  }

  // 移除处理中消息
  function removeProcessingMessage() {
    const index = messages.value.findIndex(m => m.id === 'processing')
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
    isProcessing.value = false
  }

  // 添加系统消息
  function addSystemMessage(content: string) {
    const message: DisplayMessage = {
      id: generateId(),
      role: 'system',
      content,
      timestamp: Date.now(),
    }
    messages.value.push(message)
  }

  // 添加错误消息
  function addErrorMessage(error: string) {
    const message: DisplayMessage = {
      id: generateId(),
      role: 'system',
      content: `错误: ${error}`,
      timestamp: Date.now(),
    }
    messages.value.push(message)
  }

  // 清空消息
  function clearMessages() {
    messages.value = []
  }

  // 设置当前模型
  function setModel(model: 'gemini' | 'glm') {
    currentModel.value = model
  }

  // 初始化历史消息
  function initHistory(history: ChatMessage[]) {
    messages.value = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .filter(m => m.content) // 过滤空消息
      .map((m, index) => ({
        id: `history-${index}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: Date.now() - (history.length - index) * 1000,
      }))
  }

  return {
    messages,
    displayMessages,
    messageCount,
    isProcessing,
    currentModel,
    addUserMessage,
    addAssistantMessage,
    addProcessingMessage,
    removeProcessingMessage,
    addSystemMessage,
    addErrorMessage,
    clearMessages,
    setModel,
    initHistory,
  }
})

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
