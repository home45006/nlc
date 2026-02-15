# 前端模块

> 更新时间: 2026-02-15

## 技术栈

- **框架**: Vue 3.5 (Composition API)
- **构建工具**: Vite 6.x
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **通信**: WebSocket (原生) + HTTP API
- **样式**: CSS Variables + 响应式设计

## 目录结构

```
web/src/
├── main.ts                 入口文件
├── App.vue                 根组件
├── router/
│   └ index.ts              路由配置
├── stores/
│   ├── index.ts            Store 导出
│   ├── vehicleStore.ts     车辆状态管理
│   └ chatStore.ts          对话状态管理
├── services/
│   └ api.ts                HTTP API 封装
├── hooks/
│   └ useWebSocket.ts       WebSocket Hook
├── components/
│   ├── layout/
│   │   ├── Layout.vue      主布局
│   │   └ Header.vue        顶部导航
│   ├── chat/
│   │   ├── ChatPanel.vue   对话面板
│   │   ├── MessageList.vue 消息列表
│   │   ├── MessageItem.vue 消息项
│   │   └ InputBar.vue      输入框
│   └── vehicle/
│       ├── VehicleOverview.vue  车辆概览
│       ├── ACControl.vue        空调控制
│       ├── WindowControl.vue    车窗控制
│       ├── SeatControl.vue      座椅控制
│       ├── LightControl.vue     灯光控制
│       ├── MusicControl.vue     音乐控制
│       ├── NavigationControl.vue 导航控制
│       └── BatteryIndicator.vue 电池指示
└── types/
    └ index.ts              类型定义
```

## 状态管理

### vehicleStore

```typescript
interface VehicleState {
  ac: {
    isOn: boolean
    temperature: number      // 16-32
    mode: 'cool' | 'heat' | 'auto' | 'ventilation'
    fanSpeed: number         // 1-7
  }
  windows: {
    frontLeft: number        // 0-100
    frontRight: number
    rearLeft: number
    rearRight: number
  }
  seats: {
    driverHeating: number    // 0-3
    driverVentilation: number
    passengerHeating: number
    passengerVentilation: number
  }
  lights: {
    ambientOn: boolean
    ambientColor: string
    readingOn: boolean
  }
  trunk: { isOpen: boolean }
  wiper: {
    isOn: boolean
    speed: 'low' | 'medium' | 'high'
  }
  music: {
    isPlaying: boolean
    track: string
    volume: number           // 0-100
    mode: 'sequential' | 'shuffle' | 'repeat_one'
  }
  navigation: {
    isActive: boolean
    destination: string
    routePreference: 'fastest' | 'shortest' | 'no_highway'
  }
  battery: {
    level: number            // 只读
    rangeKm: number          // 只读
  }
}

// Actions
- setState(newState)         // 完全替换状态
- updateState(partial)       // 部分更新
- reset()                    // 重置为默认值
- updateAC(partial)          // 更新空调
- updateWindows(partial)     // 更新车窗
- updateSeats(partial)       // 更新座椅
- updateLights(partial)      // 更新灯光
- updateMusic(partial)       // 更新音乐
- updateNavigation(partial)  // 更新导航
```

### chatStore

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: number
  // 结构化数据 (仅 assistant)
  domain?: string
  intent?: string
  slots?: Record<string, unknown>
  stateChanges?: StateChange[]
}

// State
- messages: Message[]
- model: 'gemini' | 'glm'
- isLoading: boolean

// Actions
- addUserMessage(text)
- addAssistantMessage(payload)
- addErrorMessage(text)
- addProcessingMessage()
- removeProcessingMessage()
- clearMessages()
- initHistory(history)
- setModel(model)
```

## 通信层

### WebSocket Hook (useWebSocket.ts)

```typescript
// 返回值
{
  isConnected: Ref<boolean>
  connectionError: Ref<string | null>
  sendMessage: (text: string) => boolean
  clearContext: () => boolean
  reconnect: () => void
  disconnect: () => void
}

// 消息处理
- init         → 初始化车辆状态和历史
- dialog       → 添加对话消息
- state        → 更新车辆状态
- processing   → 显示处理中
- error        → 显示错误
- context_cleared → 清空消息

// 特性
- 自动重连 (最多 5 次, 间隔 3 秒)
- 心跳检测 (每 30 秒)
- 组件卸载时自动断开
```

### HTTP API (api.ts)

```typescript
const api = {
  // 车辆状态
  getState(): Promise<ApiResponse<VehicleState>>
  resetState(): Promise<ApiResponse<{ message: string }>>

  // 对话
  sendMessage(message: string): Promise<ApiResponse<...>>
  getHistory(): Promise<ApiResponse<ChatMessage[]>>
  clearHistory(): Promise<ApiResponse<{ message: string }>>

  // 模型
  switchModel(model: ModelType): Promise<ApiResponse<{ model: string }>>
  getModel(): Promise<ApiResponse<{ model: string }>>

  // 健康
  health(): Promise<ApiResponse<{ status: string, timestamp: string }>>
}
```

## 组件架构

### 页面路由

```typescript
const routes = [
  { path: '/', component: Layout }
]
```

### Layout 布局

```
┌─────────────────────────────────────────┐
│ Header                                  │
│ - Logo                                  │
│ - 模型选择器                             │
│ - 清空上下文按钮                         │
├─────────────────────────────────────────┤
│                                         │
│   ChatPanel          │  VehicleOverview │
│   - MessageList      │  - Battery       │
│   - InputBar         │  - ACControl     │
│                      │  - WindowControl │
│                      │  - SeatControl   │
│                      │  - LightControl  │
│                      │  - MusicControl  │
│                      │  - Navigation    │
│                                         │
└─────────────────────────────────────────┘
```

### 组件通信流

```
用户输入
    │
    ▼
InputBar.emit('send', text)
    │
    ▼
ChatPanel 调用 useWebSocket.sendMessage()
    │
    ▼
WebSocket → 服务器
    │
    ▼
服务器响应 { type: 'dialog', payload: {...} }
    │
    ▼
useWebSocket.handleMessage()
    │
    ├─► chatStore.addAssistantMessage()
    │
    └─► vehicleStore.setState()
```

## 类型定义

```typescript
// types/index.ts

type ModelType = 'gemini' | 'glm'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface StateChange {
  field: string
  from: string
  to: string
}

// WebSocket 消息类型
interface WSMessage {
  type: 'init' | 'dialog' | 'state' | 'processing' | 'error' | 'context_cleared' | 'pong'
  payload?: unknown
}

interface WSInitPayload {
  vehicleState: VehicleState
  history: ChatMessage[]
  model: string
}

interface WSDialogPayload {
  ttsText: string
  stateChanges: StateChange[]
  meta: { model: string, latencyMs: number, tokens: {...} }
  domain: string
  intent: string
  slots: Record<string, unknown>
  confidence: number
  hasCommand: boolean
}

interface WSStatePayload {
  vehicleState: VehicleState
}
```

## 响应式设计

- 支持 768px 以上屏幕
- 左右分栏布局 (聊天 + 车辆控制)
- 自适应高度滚动

## 文件清单

| 文件 | 职责 | 行数 |
|------|------|------|
| main.ts | 入口 | ~10 |
| App.vue | 根组件 | ~12 |
| router/index.ts | 路由 | ~15 |
| stores/vehicleStore.ts | 车辆状态 | ~89 |
| stores/chatStore.ts | 对话状态 | ~80 |
| services/api.ts | HTTP API | ~82 |
| hooks/useWebSocket.ts | WebSocket | ~205 |
| components/layout/Layout.vue | 主布局 | ~60 |
| components/layout/Header.vue | 顶部导航 | ~80 |
| components/chat/ChatPanel.vue | 对话面板 | ~100 |
| components/chat/MessageList.vue | 消息列表 | ~50 |
| components/chat/MessageItem.vue | 消息项 | ~120 |
| components/chat/InputBar.vue | 输入框 | ~80 |
| components/vehicle/VehicleOverview.vue | 车辆概览 | ~80 |
| components/vehicle/ACControl.vue | 空调 | ~70 |
| components/vehicle/WindowControl.vue | 车窗 | ~60 |
| components/vehicle/SeatControl.vue | 座椅 | ~60 |
| components/vehicle/LightControl.vue | 灯光 | ~50 |
| components/vehicle/MusicControl.vue | 音乐 | ~60 |
| components/vehicle/NavigationControl.vue | 导航 | ~50 |
| components/vehicle/BatteryIndicator.vue | 电池 | ~40 |
| types/index.ts | 类型 | ~80 |

**总计**: ~22 个文件, ~1157 行代码
