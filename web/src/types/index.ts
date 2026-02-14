// 车辆状态类型
export interface VehicleState {
  ac: {
    isOn: boolean
    temperature: number
    mode: 'cool' | 'heat' | 'auto' | 'ventilation'
    fanSpeed: number
  }
  windows: {
    frontLeft: number
    frontRight: number
    rearLeft: number
    rearRight: number
  }
  seats: {
    driverHeating: number
    driverVentilation: number
    passengerHeating: number
    passengerVentilation: number
  }
  lights: {
    ambientOn: boolean
    ambientColor: string
    readingOn: boolean
  }
  trunk: {
    isOpen: boolean
  }
  wiper: {
    isOn: boolean
    speed: 'low' | 'medium' | 'high'
  }
  music: {
    isPlaying: boolean
    track: string
    volume: number
    mode: 'sequential' | 'shuffle' | 'repeat_one'
  }
  navigation: {
    isActive: boolean
    destination: string
    routePreference: 'fastest' | 'shortest' | 'no_highway'
  }
  battery: {
    level: number
    rangeKm: number
  }
}

// 状态变更类型
export interface StateChange {
  field: string
  from: string
  to: string
}

// 对话消息类型
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

// 工具调用类型
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

// 对话输出类型
export interface DialogOutput {
  ttsText: string
  stateChanges: StateChange[]
  meta: {
    model: string
    latencyMs: number
    tokens: {
      prompt: number
      completion: number
    }
  }
}

// WebSocket 消息类型
export type WSMessageType =
  | 'init'
  | 'dialog'
  | 'state'
  | 'processing'
  | 'error'
  | 'ping'
  | 'pong'
  | 'clear_context'
  | 'context_cleared'

export interface WSMessage {
  type: WSMessageType
  payload?: unknown
}

export interface WSInitPayload {
  vehicleState: VehicleState
  history: ChatMessage[]
  model: string
}

export interface WSDialogPayload {
  ttsText: string
  stateChanges: StateChange[]
  meta: {
    model: string
    latencyMs: number
    tokens: {
      prompt: number
      completion: number
    }
  }
  // 结构化识别结果
  domain?: string
  intent?: string
  slots?: Record<string, unknown>
  confidence?: number
  hasCommand?: boolean
}

export interface WSStatePayload {
  vehicleState: VehicleState
}

export interface WSErrorPayload {
  message: string
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 模型类型
export type ModelType = 'gemini' | 'glm'
