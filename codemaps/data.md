# 数据模型

> 更新时间: 2026-02-13

## 类型依赖关系

```
                    ┌─────────────┐
                    │ DomainType  │
                    │ (枚举联合)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        DialogOutput  FunctionMeta  FunctionRegistry.resolve()
              │
              ▼
        DialogResult ← DialogManager.handleInput()
              │
              ├── StateChange[]
              └── DialogOutput
```

## 核心类型

### Domain 与 Intent (`types/domain.ts`)

```typescript
Domain = VEHICLE_CONTROL | MUSIC | NAVIGATION | CHAT

VehicleControlIntent:
  ac_control_*          (turn_on/turn_off/set_temperature/set_mode/set_fan_speed)
  window_control_*      (open/close/set_position)
  seat_control_*        (heating_on/off/set_level, ventilation_on/off/set_level)
  light_control_*       (turn_on/turn_off/set_color)
  trunk_control_*       (open/close)
  wiper_control_*       (turn_on/turn_off/set_speed)

MusicIntent:
  music_control_*       (play/pause/next/previous/search_and_play/set_volume/set_play_mode)

NavigationIntent:
  navigation_control_*  (set_destination/set_route_preference/cancel)
```

### VehicleState (`types/vehicle.ts`)

```
VehicleState (readonly)
├── ac
│   ├── isOn: boolean (默认 false)
│   ├── temperature: number (默认 26, 范围 16-32)
│   ├── mode: 'cool'|'heat'|'auto'|'ventilation' (默认 'auto')
│   └── fanSpeed: number (默认 3, 范围 1-7)
├── windows
│   ├── frontLeft: number (0-100%, 默认 0)
│   ├── frontRight: number
│   ├── rearLeft: number
│   └── rearRight: number
├── seats
│   ├── driverHeating: number (0-3, 默认 0)
│   ├── driverVentilation: number (0-3)
│   ├── passengerHeating: number (0-3)
│   └── passengerVentilation: number (0-3)
├── lights
│   ├── ambientOn: boolean (默认 false)
│   ├── ambientColor: string (默认 '暖白')
│   └── readingOn: boolean (默认 false)
├── trunk
│   └── isOpen: boolean (默认 false)
├── wiper
│   ├── isOn: boolean (默认 false)
│   └── speed: 'low'|'medium'|'high' (默认 'medium')
├── music
│   ├── isPlaying: boolean (默认 false)
│   ├── track: string (默认 '')
│   ├── volume: number (0-100, 默认 50)
│   └── mode: 'sequential'|'shuffle'|'repeat_one' (默认 'sequential')
├── navigation
│   ├── isActive: boolean (默认 false)
│   ├── destination: string (默认 '')
│   └── routePreference: 'fastest'|'shortest'|'no_highway' (默认 'fastest')
└── battery (只读, 不可变更)
    ├── level: number (默认 78)
    └── rangeKm: number (默认 320)
```

### LLM 通信类型 (`types/llm.ts`)

```
ChatMessage
├── role: 'system'|'user'|'assistant'|'tool'
├── content: string
├── tool_calls?: ToolCall[]        (仅 assistant)
└── tool_call_id?: string          (仅 tool)

ToolCall
├── id: string
├── type: 'function'
└── function
    ├── name: string               (8 个函数名之一)
    └── arguments: string          (JSON 序列化参数)

ToolDefinition
├── type: 'function'
└── function
    ├── name: string
    ├── description: string        (中文描述)
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
├── name: string                   (模型标识)
└── chat(request) → ChatResponse
```

### 对话输出 (`types/dialog.ts`)

```
DialogOutput
├── domain: DomainType
├── intent: string
├── slots: Record<string, unknown>
├── confidence: number             (工具调用 0.95, 闲聊 0.9)
├── ttsText: string
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

## 8 大工具函数参数

| 函数 | action | 参数 |
|------|--------|------|
| `control_ac` | `turn_on` | - |
| | `turn_off` | - |
| | `set_temperature` | `temperature: 16-32` |
| | `set_mode` | `mode: cool\|heat\|auto\|ventilation` |
| | `set_fan_speed` | `fan_speed: 1-7` |
| `control_window` | `open` | `position: front_left\|front_right\|rear_left\|rear_right\|all` |
| | `close` | `position` |
| | `set_position` | `position, open_percentage: 0-100` |
| `control_seat` | `heating_on/off` | `seat: driver\|passenger` |
| | `set_heating_level` | `seat, level: 1-3` |
| | `ventilation_on/off` | `seat` |
| | `set_ventilation_level` | `seat, level: 1-3` |
| `control_light` | `turn_on/off` | `light_type: ambient\|reading` |
| | `set_color` | `light_type: ambient, color: string` |
| `control_trunk` | `open/close` | - |
| `control_wiper` | `turn_on/off` | - |
| | `set_speed` | `speed: low\|medium\|high` |
| `control_music` | `play/pause/next/previous` | - |
| | `search_and_play` | `query: string` |
| | `set_volume` | `volume: 0-100` |
| | `set_play_mode` | `play_mode: sequential\|shuffle\|repeat_one` |
| `control_navigation` | `set_destination` | `destination: string` |
| | `set_route_preference` | `route_preference: fastest\|shortest\|no_highway` |
| | `cancel` | - |

## Gemini 消息格式转换

```
ChatMessage (内部)          →  Gemini API 格式
─────────────────────────────────────────────
system                      →  body.systemInstruction
user                        →  { role: 'user', parts: [{text}] }
assistant (无 tool_calls)   →  { role: 'model', parts: [{text}] }
assistant (有 tool_calls)   →  { role: 'model', parts: [{functionCall}...] }
tool                        →  { role: 'user', parts: [{functionResponse}] }

注意: 连续相同 role 会被 mergeConsecutiveRoles() 合并
```
