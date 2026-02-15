# 数据模型

> 更新时间: 2026-02-15

## 类型依赖关系

```
                    ┌─────────────────┐
                    │   DomainType    │
                    │    (枚举)        │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ DomainRouting │   │ DomainHandler │   │ DomainResult  │
│ (路由结果)     │   │ (处理器接口)   │   │ (处理结果)     │
└───────┬───────┘   └───────────────┘   └───────┬───────┘
        │                                       │
        ▼                                       ▼
┌───────────────┐                       ┌───────────────┐
│ MultiIntent   │                       │   Command     │
│ Routing       │                       │  (可执行指令)  │
└───────────────┘                       └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │ VehicleState  │
                                        │  (车辆状态)    │
                                        └───────────────┘
```

## 核心类型

### Domain 领域枚举 (`types/domain.ts`)

```typescript
enum Domain {
  VEHICLE_CONTROL = 'vehicle_control',  // 车辆控制
  MUSIC = 'music',                       // 音乐控制
  NAVIGATION = 'navigation',             // 导航控制
  CHAT = 'chat'                          // 智能问答
}

type DomainType = Domain.VEHICLE_CONTROL | Domain.MUSIC | Domain.NAVIGATION | Domain.CHAT
```

### VehicleState 车辆状态 (`types/vehicle.ts`)

```
VehicleState (readonly 不可变)
├── ac (空调)
│   ├── isOn: boolean           (默认 false)
│   ├── temperature: number     (默认 26, 范围 16-32)
│   ├── mode: ACMode            (默认 'auto')
│   │   └── 'cool' | 'heat' | 'auto' | 'ventilation'
│   └── fanSpeed: number        (默认 3, 范围 1-7)
│
├── windows (车窗)
│   ├── frontLeft: number       (0-100%, 默认 0)
│   ├── frontRight: number
│   ├── rearLeft: number
│   └── rearRight: number
│
├── seats (座椅)
│   ├── driverHeating: number       (0-3, 默认 0)
│   ├── driverVentilation: number   (0-3, 默认 0)
│   ├── passengerHeating: number    (0-3, 默认 0)
│   └── passengerVentilation: number (0-3, 默认 0)
│
├── lights (灯光)
│   ├── ambientOn: boolean      (默认 false)
│   ├── ambientColor: string    (默认 '#FFFFFF')
│   └── readingOn: boolean      (默认 false)
│
├── trunk (后备箱)
│   └── isOpen: boolean         (默认 false)
│
├── wiper (雨刮器)
│   ├── isOn: boolean           (默认 false)
│   └── speed: WiperSpeed       (默认 'medium')
│       └── 'low' | 'medium' | 'high'
│
├── music (音乐)
│   ├── isPlaying: boolean      (默认 false)
│   ├── track: string           (默认 '')
│   ├── volume: number          (0-100, 默认 50)
│   └── mode: PlayMode          (默认 'sequential')
│       └── 'sequential' | 'shuffle' | 'repeat_one'
│
├── navigation (导航)
│   ├── isActive: boolean       (默认 false)
│   ├── destination: string     (默认 '')
│   └── routePreference: RoutePref (默认 'fastest')
│       └── 'fastest' | 'shortest' | 'no_highway'
│
└── battery (电池 - 只读, 不可变更)
    ├── level: number           (默认 78)
    └── rangeKm: number         (默认 320)
```

### LLM 通信类型 (`types/llm.ts`)

```
ChatMessage
├── role: 'system' | 'user' | 'assistant' | 'tool'
├── content: string
├── tool_calls?: ToolCall[]        (仅 assistant)
└── tool_call_id?: string          (仅 tool)

ToolCall
├── id: string
├── type: 'function'
└── function
    ├── name: string
    └── arguments: string          (JSON 序列化)

ToolDefinition
├── type: 'function'
└── function
    ├── name: string
    ├── description: string
    └── parameters: object         (JSON Schema)

ChatRequest
├── messages: ChatMessage[]
├── tools?: ToolDefinition[]
├── temperature?: number           (默认 0.3)
└── maxTokens?: number             (默认 1024)

ChatResponse
├── content: string | null
├── toolCalls: ToolCall[]
└── usage: { promptTokens, completionTokens }

LLMProvider (接口)
├── name: string
└── chat(request: ChatRequest) → Promise<ChatResponse>
```

### 对话输出类型 (`types/dialog.ts`)

```
DialogOutput
├── domain: DomainType
├── intent: string
├── slots: Record<string, unknown>
├── confidence: number             (0-1)
├── ttsText: string                (TTS 回复文本)
├── hasCommand: boolean
└── meta
    ├── model: string
    ├── latencyMs: number
    └── tokens: { prompt, completion }

StateChange
├── field: string                  (如 '空调温度', '主驾车窗')
├── from: string                   (如 '26°C', '0%')
└── to: string                     (如 '24°C', '100%')

DialogResult
├── output: DialogOutput
└── stateChanges: StateChange[]
```

## 新架构核心类型 (`core/types.ts`)

### 路由相关

```typescript
// 单领域路由结果
interface DomainRouting {
  readonly domain: DomainType
  readonly rewrittenQuery: string      // 改写后的查询
  readonly originalQuery: string       // 原始输入
  readonly confidence: number          // 0-1
  readonly context?: RoutingContextInfo
}

// 路由上下文信息
interface RoutingContextInfo {
  readonly previousDomain?: DomainType
  readonly relatedEntities?: Record<string, unknown>
  readonly isInherited?: boolean
}

// 多意图路由结果
interface MultiIntentRouting {
  readonly routings: ReadonlyArray<DomainRouting>
  readonly isSequential: boolean       // 是否顺序执行
  readonly overallConfidence: number
}

// 路由上下文 (传给中枢控制器)
interface RoutingContext {
  readonly vehicleState: VehicleState
  readonly dialogHistory: ReadonlyArray<ChatMessage>
}
```

### 领域处理相关

```typescript
// 领域处理上下文 (传给 DomainHandler)
interface DomainContext {
  readonly vehicleState: VehicleState
  readonly dialogHistory: ReadonlyArray<ChatMessage>
  readonly previousDomain?: DomainType
  readonly routingContext?: RoutingContextInfo
}

// 领域处理结果
interface DomainResult {
  readonly intent: string
  readonly slots: Record<string, unknown>
  readonly commands: ReadonlyArray<Command>
  readonly ttsText?: string
  readonly shouldContinue?: boolean    // 是否继续处理下一个路由
  readonly confidence: number
}

// 可执行指令
interface Command {
  readonly type: string                // 指令类型 (对应 functionName)
  readonly params: Record<string, unknown>
  readonly domain: DomainType
  readonly priority?: number           // 执行优先级
}

// 意图解析结果 (小模型输出)
interface IntentResult {
  readonly intent: string
  readonly slots: Record<string, unknown>
  readonly confidence: number
}
```

### 接口定义

```typescript
// 领域处理器接口
interface DomainHandler {
  readonly domain: DomainType
  handle(routing: DomainRouting, context: DomainContext): Promise<DomainResult>
}

// 领域模型接口 (小模型)
interface DomainModel {
  readonly name: string
  parseIntent(query: string, context: DomainContext): Promise<IntentResult>
}

// 中枢控制器接口
interface CentralController {
  route(userInput: string, context: RoutingContext): Promise<MultiIntentRouting>
}

// 领域路由器接口
interface DomainRouter {
  registerHandler(handler: DomainHandler): void
  dispatch(routing: DomainRouting, context: DomainContext): Promise<DomainResult>
  dispatchAll(routings: ReadonlyArray<DomainRouting>, context: DomainContext): Promise<ReadonlyArray<DomainResult>>
}
```

### 问答领域子类型

```typescript
const ChatSubType = {
  FREE_CHAT: 'free_chat',       // 自由聊天
  VEHICLE_QA: 'vehicle_qa',     // 车辆问答
  MULTI_TURN: 'multi_turn',     // 多轮对话
} as const

interface ChatDomainInfo {
  readonly subType: ChatSubTypeType
  readonly needsContext: boolean
  readonly topic?: string
}
```

## 指令参数映射

### 空调控制 (control_ac)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| turn_on | - | - |
| turn_off | - | - |
| set_temperature | temperature | 16-32 |
| set_mode | mode | cool, heat, auto, ventilation |
| set_fan_speed | fan_speed | 1-7 |

### 车窗控制 (control_window)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| open | position | front_left, front_right, rear_left, rear_right, all |
| close | position | 同上 |
| set_position | position, open_percentage | 0-100 |

### 座椅控制 (control_seat)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| heating_on | seat | driver, passenger |
| heating_off | seat | 同上 |
| set_heating_level | seat, level | 1-3 |
| ventilation_on | seat | 同上 |
| ventilation_off | seat | 同上 |
| set_ventilation_level | seat, level | 1-3 |

### 灯光控制 (control_light)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| turn_on | light_type | ambient, reading |
| turn_off | light_type | 同上 |
| set_color | light_type, color | ambient + 颜色字符串 |

### 后备箱控制 (control_trunk)

| action | 参数 |
|--------|------|
| open | - |
| close | - |

### 雨刮器控制 (control_wiper)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| turn_on | - | - |
| turn_off | - | - |
| set_speed | speed | low, medium, high |

### 音乐控制 (control_music)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| play | - | - |
| pause | - | - |
| next | - | - |
| previous | - | - |
| search_and_play | query | 搜索关键词 |
| set_volume | volume | 0-100 |
| set_play_mode | play_mode | sequential, shuffle, repeat_one |

### 导航控制 (control_navigation)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| set_destination | destination | 目的地字符串 |
| set_route_preference | route_preference | fastest, shortest, no_highway |
| cancel | - | - |

## JSON 响应格式

### 中枢控制器输出

```json
{
  "routings": [
    {
      "domain": "vehicle_control",
      "rewrittenQuery": "将空调温度调到24度",
      "originalQuery": "开空调24度",
      "confidence": 0.95,
      "context": {
        "previousDomain": "music",
        "isInherited": false
      }
    }
  ],
  "isSequential": true,
  "overallConfidence": 0.95
}
```

### 领域模型输出

```json
{
  "intent": "ac_set_temperature",
  "slots": {
    "temperature": 24
  },
  "confidence": 0.98
}
```

### WebSocket 响应

```json
{
  "type": "dialog",
  "payload": {
    "ttsText": "好的，空调温度已调整为24度",
    "stateChanges": [
      { "field": "空调温度", "from": "26°C", "to": "24°C" }
    ],
    "domain": "vehicle_control",
    "intent": "ac_set_temperature",
    "slots": { "temperature": 24 },
    "confidence": 0.95,
    "hasCommand": true,
    "meta": {
      "model": "multi-stage",
      "latencyMs": 1234,
      "tokens": { "prompt": 150, "completion": 50 }
    }
  }
}
```

## 类型文件清单

| 文件 | 职责 | 主要类型 |
|------|------|----------|
| `types/domain.ts` | 领域枚举 | Domain, DomainType |
| `types/vehicle.ts` | 车辆状态 | VehicleState, ACMode, PlayMode, ... |
| `types/llm.ts` | LLM 通信 | ChatMessage, ToolCall, LLMProvider |
| `types/dialog.ts` | 对话输出 | DialogOutput, StateChange, DialogResult |
| `types/index.ts` | 统一导出 | - |
| `core/types.ts` | 核心抽象 | DomainRouting, DomainResult, Command, ... |
