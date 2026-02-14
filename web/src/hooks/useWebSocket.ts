import { ref, onMounted, onUnmounted } from 'vue'
import { useVehicleStore } from '../stores/vehicleStore'
import { useChatStore } from '../stores/chatStore'
import type { WSMessage, WSInitPayload, WSDialogPayload, WSStatePayload } from '../types'

const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 5

export function useWebSocket() {
  const vehicleStore = useVehicleStore()
  const chatStore = useChatStore()

  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)
  const reconnectAttempts = ref(0)

  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  function connect() {
    // 构建 WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        isConnected.value = true
        connectionError.value = null
        reconnectAttempts.value = 0
        console.log('WebSocket connected')
      }

      ws.onclose = () => {
        isConnected.value = false
        console.log('WebSocket disconnected')

        // 尝试重连
        if (reconnectAttempts.value < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.value++
          console.log(`Reconnecting... Attempt ${reconnectAttempts.value}`)
          reconnectTimeout = setTimeout(connect, RECONNECT_DELAY)
        } else {
          connectionError.value = '连接失败，请刷新页面重试'
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        connectionError.value = '连接错误'
      }

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
    } catch (error) {
      connectionError.value = '无法建立连接'
      console.error('Failed to create WebSocket:', error)
    }
  }

  function handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'init': {
        const payload = message.payload as WSInitPayload
        vehicleStore.setState(payload.vehicleState)
        chatStore.initHistory(payload.history)
        chatStore.setModel(payload.model as 'gemini' | 'glm')
        break
      }

      case 'dialog': {
        const payload = message.payload as WSDialogPayload
        chatStore.removeProcessingMessage()
        chatStore.addAssistantMessage(payload)
        break
      }

      case 'state': {
        const payload = message.payload as WSStatePayload
        vehicleStore.setState(payload.vehicleState)
        break
      }

      case 'processing': {
        chatStore.addProcessingMessage()
        break
      }

      case 'error': {
        const payload = message.payload as { message: string }
        chatStore.removeProcessingMessage()
        chatStore.addErrorMessage(payload.message)
        break
      }

      case 'context_cleared': {
        chatStore.clearMessages()
        break
      }

      case 'pong': {
        // 心跳响应
        break
      }

      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  function sendMessage(text: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      chatStore.addErrorMessage('连接已断开，正在重连...')
      return false
    }

    // 添加用户消息到本地
    chatStore.addUserMessage(text)

    // 发送到服务器
    const message: WSMessage = {
      type: 'dialog',
      payload: { message: text },
    }

    try {
      ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Failed to send message:', error)
      chatStore.addErrorMessage('发送失败')
      return false
    }
  }

  function clearContext() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      chatStore.addErrorMessage('连接已断开，无法清空上下文')
      return false
    }

    const message: WSMessage = {
      type: 'clear_context',
    }

    try {
      ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Failed to clear context:', error)
      chatStore.addErrorMessage('清空上下文失败')
      return false
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    isConnected.value = false
  }

  // 心跳检测
  function startHeartbeat() {
    const heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 每30秒发送心跳

    return () => clearInterval(heartbeatInterval)
  }

  onMounted(() => {
    connect()
    const stopHeartbeat = startHeartbeat()
    onUnmounted(stopHeartbeat)
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    connectionError,
    sendMessage,
    clearContext,
    reconnect: connect,
    disconnect,
  }
}
