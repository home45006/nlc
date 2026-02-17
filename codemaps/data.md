# 数据模型

> 更新时间: 2026-02-17

## 类型依赖关系

```
                    +---------------------+
                    |   DomainType        |
                    |    (枚举)            |
                    +----------+----------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
+---------------+       +---------------+       +---------------+
| SkillMetadata |       | Skill         |       | Orchestration |
| Yaml (V2)     |       | (接口)         |       | Result        |
+---------------+       +---------------+       +-------+-------+
                                                        |
                                                        v
                                                +---------------+
                                                | SkillResult   |
                                                +-------+-------+
                                                        |
                                                        v
                                                +---------------+
                                                |   Command     |
                                                |  (可执行指令)  |
                                                +-------+-------+
                                                        |
                                                        v
                                                +---------------+
                                                | VehicleState  |
                                                |  (车辆状态)    |
                                                +---------------+
```

## 核心类型

### Domain 领域枚举 (`types/domain.ts`)

```typescript
export const Domain = {
  VEHICLE_CONTROL: 'vehicle_control',  // 车辆控制
  MUSIC: 'music',                       // 音乐控制
  NAVIGATION: 'navigation',             // 导航控制
  CHAT: 'chat'                          // 智能问答
} as const

export type DomainType = (typeof Domain)[keyof typeof Domain]
```

### VehicleState 车辆状态 (`types/vehicle.ts`)

```
VehicleState (readonly 不可变)
+-- ac (空调)
|   +-- isOn: boolean           (默认 false)
|   +-- temperature: number     (默认 26, 范围 16-32)
|   +-- mode: ACMode            (默认 'auto')
|   |   + 'cool' | 'heat' | 'auto' | 'vent'
|   +-- fanSpeed: number        (默认 3, 范围 1-7)
|
+-- windows (车窗)
|   +-- frontLeft: number       (0-100%, 默认 0)
|   +-- frontRight: number
|   +-- rearLeft: number
|   +-- rearRight: number
|
+-- seats (座椅)
|   +-- driverHeating: number       (0-3, 默认 0)
|   +-- driverVentilation: number   (0-3, 默认 0)
|   +-- passengerHeating: number    (0-3, 默认 0)
|   +-- passengerVentilation: number (0-3, 默认 0)
|
+-- lights (灯光)
|   +-- ambientOn: boolean      (默认 false)
|   +-- ambientColor: string    (默认 '#FFFFFF')
|   +-- readingOn: boolean      (默认 false)
|
+-- trunk (后备箱)
|   +-- isOpen: boolean         (默认 false)
|
+-- wiper (雨刮器)
|   +-- isOn: boolean           (默认 false)
|   +-- speed: WiperSpeed       (默认 'medium')
|       + 'low' | 'medium' | 'high'
|
+-- music (音乐)
|   +-- isPlaying: boolean      (默认 false)
|   +-- track: string           (默认 '')
|   +-- volume: number          (0-100, 默认 50)
|   +-- mode: PlayMode          (默认 'sequential')
|       + 'sequential' | 'shuffle' | 'repeat_one'
|
+-- navigation (导航)
|   +-- isActive: boolean       (默认 false)
|   +-- destination: string     (默认 '')
|   +-- routePreference: RoutePref (默认 'fastest')
|       + 'fastest' | 'shortest' | 'no_highway'
|
+-- battery (电池 - 只读, 不可变更)
    +-- level: number           (默认 78)
    +-- rangeKm: number         (默认 320)
```

## Skill V2 类型 (`src/skills/v2/types.ts`)

### SkillMetadataYaml 元数据（第一层）

```typescript
interface SkillMetadataYaml {
  // 必需字段
  readonly id: string                    // Skill 唯一标识
  readonly name: string                  // 显示名称
  readonly description: string           // 描述
  readonly domain: DomainType            // 所属领域

  // 可选字段
  readonly version?: string              // 版本号
  readonly author?: string               // 作者
  readonly priority?: number             // 优先级（越小越高，默认 100）
  readonly enabled?: boolean             // 是否启用（默认 true）
  readonly tags?: ReadonlyArray<string>  // 标签
  readonly dependencies?: ReadonlyArray<string>  // 依赖的其他 Skill

  // 能力定义
  readonly capabilities?: ReadonlyArray<CapabilityDefinition>
}
```

### CapabilityDefinition 能力定义

```typescript
interface CapabilityDefinition {
  readonly name: string                    // 能力标识
  readonly description: string             // 能力描述
  readonly examples?: ReadonlyArray<string> // 示例语句
  readonly slots?: ReadonlyArray<SlotDefinition>  // 参数定义
  readonly keywords?: ReadonlyArray<string>       // 匹配关键词
}

interface SlotDefinition {
  readonly name: string                    // 槽位名称
  readonly type: 'string' | 'number' | 'boolean' | 'enum'
  readonly required?: boolean              // 是否必需
  readonly enumValues?: ReadonlyArray<string>  // 枚举值
  readonly description?: string            // 描述
  readonly min?: number                    // 最小值（number 类型）
  readonly max?: number                    // 最大值（number 类型）
}
```

### SkillInstructions 指令（第二层）

```typescript
interface SkillInstructions {
  readonly content: string                 // SKILL.md 原始内容
  readonly parsedCapabilities?: ParsedCapability[]  // 解析后的能力
}

interface ParsedCapability {
  readonly name: string
  readonly description: string
  readonly examples: string[]
}
```

## Skill 通用类型 (`src/skills/types.ts`)

### SkillCapability 能力描述

```typescript
interface SkillCapability {
  readonly name: string                    // 能力标识
  readonly description: string             // 能力描述
  readonly examples: ReadonlyArray<string> // 示例语句
  readonly slots?: ReadonlyArray<CapabilitySlot>  // 参数定义
  readonly keywords?: ReadonlyArray<string>       // 匹配关键词
}

interface CapabilitySlot {
  readonly name: string                    // 槽位名称
  readonly type: 'string' | 'number' | 'boolean' | 'enum'
  readonly required: boolean               // 是否必需
  readonly enumValues?: ReadonlyArray<string>  // 枚举值
  readonly description?: string            // 描述
}
```

### Skill 接口

```typescript
interface Skill {
  readonly id: string                      // Skill 唯一标识
  readonly name: string                    // Skill 显示名称
  readonly description: string             // Skill 描述
  readonly domain: DomainType              // 所属领域
  readonly capabilities: ReadonlyArray<SkillCapability>  // 能力列表
  readonly metadata?: SkillMetadata        // 元数据（可选）

  execute(input: SkillInput, context: SkillContext): Promise<SkillResult>
}
```

### Skill 输入输出

```typescript
interface SkillInput {
  readonly originalQuery: string           // 原始用户查询
  readonly rewrittenQuery: string          // 改写后的查询
  readonly confidence: number              // 路由置信度 (0-1)
  readonly contextInfo?: RoutingContextInfo  // 路由上下文信息
}

interface SkillContext {
  readonly vehicleState: VehicleState      // 当前车辆状态
  readonly dialogHistory: ReadonlyArray<ChatMessage>  // 对话历史
  readonly previousDomain?: DomainType     // 上一个处理的领域
}

interface SkillResult {
  readonly success: boolean                // 是否成功
  readonly intent: string                  // 识别出的意图
  readonly slots: Record<string, unknown>  // 提取的槽位/实体
  readonly commands: ReadonlyArray<Command> // 要执行的指令列表
  readonly ttsText?: string                // TTS 回复文本
  readonly shouldContinue?: boolean        // 是否继续处理下一个 Skill
  readonly confidence: number              // 置信度 (0-1)
  readonly error?: string                  // 错误信息（失败时）
  readonly errorCode?: string              // 错误码（可选）
}
```

### 意图识别类型

```typescript
interface RecognizedIntent {
  readonly skillId: string                 // 识别的 Skill ID
  readonly capability: string              // 能力名称
  readonly confidence: number              // 置信度 (0-1)
  readonly slots?: Record<string, unknown> // 提取的槽位
}

interface IntentRecognitionResult {
  readonly success: boolean
  readonly intents: RecognizedIntent[]     // 识别的意图列表
  readonly response: string                // LLM 原始响应
  readonly reasoning?: string              // 推理过程
  readonly error?: string
}
```

## 编排相关类型 (`src/skills/v2/file-based-orchestrator.ts`)

### OrchestratorContext

```typescript
interface OrchestratorContext {
  readonly vehicleState: VehicleState      // 当前车辆状态
  readonly dialogHistory: ChatMessage[]    // 对话历史
  readonly previousDomain?: string         // 上一个处理的领域
  readonly currentQuery?: string           // 当前查询
}
```

### OrchestrationResult

```typescript
interface OrchestrationResult {
  readonly success: boolean                // 是否成功
  readonly response: string                // LLM 回复文本
  readonly skillResults: SkillResult[]     // Skill 执行结果列表
  readonly commands: Command[]             // 汇总的指令列表
  readonly intents?: RecognizedIntent[]    // 识别的意图列表
  readonly error?: string                  // 错误信息
}
```

## 路由相关类型 (`src/core/types.ts`)

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

// 可执行指令
interface Command {
  readonly type: string                // 指令类型
  readonly params: Record<string, unknown>
  readonly domain: DomainType
  readonly priority?: number           // 执行优先级
}
```

## LLM 通信类型 (`types/llm.ts`)

```
ChatMessage
+-- role: 'system' | 'user' | 'assistant' | 'tool'
+-- content: string
+-- tool_calls?: ToolCall[]        (仅 assistant)
+-- tool_call_id?: string          (仅 tool)

ChatRequest
+-- messages: ChatMessage[]
+-- tools?: ToolDefinition[]
+-- temperature?: number           (默认 0.3)
+-- maxTokens?: number             (默认 1024)

ChatResponse
+-- content: string | null
+-- toolCalls: ToolCall[]
+-- usage: { promptTokens, completionTokens }

LLMProvider (接口)
+-- name: string
+-- chat(request: ChatRequest) -> Promise<ChatResponse>
```

## 指令参数映射

### 空调控制 (ac_control)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| turn_on | - | - |
| turn_off | - | - |
| set_temperature | temperature | 16-32 |
| set_mode | mode | cool, heat, auto, vent |
| set_fan_speed | fan_speed | 1-7 |

### 车窗控制 (window_control)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| open | position | front_left, front_right, rear_left, rear_right, all |
| close | position | 同上 |
| set_position | position, percentage | 0-100 |

### 座椅控制 (seat_control)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| heating_on | seat | driver, passenger, rear_left, rear_right |
| heating_off | seat | 同上 |
| ventilation_on | seat | 同上 |
| ventilation_off | seat | 同上 |
| set_level | seat, feature, level | 1-3 |

### 灯光控制 (light_control)

| action | 参数 | 范围/选项 |
|--------|------|-----------|
| turn_on | light_type | ambient, reading, headlight |
| turn_off | light_type | 同上 |
| set_color | light_type, color | 颜色名称 |
| set_brightness | light_type, brightness | 0-100 |

### 音乐控制 (music 控制)

| 能力 | 参数 | 范围/选项 |
|------|------|-----------|
| play | - | - |
| pause | - | - |
| next | - | - |
| previous | - | - |
| search | query | 搜索关键词 |
| volume | volume | 0-100 |
| mode | play_mode | sequential, shuffle, repeat_one |

### 导航控制 (navigation 控制)

| 能力 | 参数 | 范围/选项 |
|------|------|-----------|
| set_destination | destination | 目的地字符串 |
| set_route_preference | route_preference | fastest, shortest, no_highway |
| cancel | - | - |

### 问答能力 (chat 能力)

| 能力 | 参数 | 描述 |
|------|------|------|
| free_chat | message | 自由聊天 |
| vehicle_qa | question | 车辆问答 |
| weather_query | city?, date? | 天气查询 |

## JSON 响应格式

### 编排器输出

```json
{
  "success": true,
  "response": "好的，空调温度已调整为24度",
  "skillResults": [
    {
      "success": true,
      "intent": "ac_control",
      "slots": { "action": "set_temperature", "temperature": 24 },
      "commands": [
        { "type": "control_ac", "params": { "action": "set_temperature", "temperature": 24 }, "domain": "vehicle_control" }
      ],
      "ttsText": "空调温度已调整为24度",
      "confidence": 0.98
    }
  ],
  "commands": [...],
  "intents": [
    { "skillId": "vehicle_control", "capability": "ac_control", "confidence": 0.95 }
  ]
}
```

### 意图识别输出

```json
{
  "reasoning": "用户想调整空调温度...",
  "intents": [
    {
      "skillId": "vehicle_control",
      "capability": "ac_control",
      "slots": { "action": "set_temperature", "temperature": 24 },
      "confidence": 0.95
    }
  ]
}
```

### Skill 结果输出

```json
{
  "success": true,
  "intent": "ac_control",
  "slots": { "action": "set_temperature", "temperature": 24 },
  "commands": [
    { "type": "control_ac", "params": { "action": "set_temperature", "temperature": 24 }, "domain": "vehicle_control" }
  ],
  "ttsText": "好的，空调温度已调整为24度",
  "shouldContinue": true,
  "confidence": 0.98
}
```

## 类型文件清单

| 文件 | 职责 | 主要类型 |
|------|------|----------|
| `types/domain.ts` | 领域枚举 | Domain, DomainType |
| `types/vehicle.ts` | 车辆状态 | VehicleState, ACMode, PlayMode |
| `types/llm.ts` | LLM 通信 | ChatMessage, LLMProvider |
| `types/dialog.ts` | 对话输出 | DialogOutput, StateChange |
| `types/index.ts` | 统一导出 | - |
| `core/types.ts` | 核心抽象 | DomainRouting, DomainResult, Command |
| `skills/types.ts` | Skill 通用类型 | Skill, SkillCapability, SkillResult |
| `skills/v2/types.ts` | Skill V2 类型 | SkillMetadataYaml, CapabilityDefinition |
| `skills/v2/file-based-orchestrator.ts` | 编排类型 | OrchestrationResult, OrchestratorContext |
