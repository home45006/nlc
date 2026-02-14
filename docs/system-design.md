# 新能源智能座舱自然语言控制与交互系统 (NLC) - 系统设计文档

## 一、概述

本系统是一个面向新能源汽车智能座舱的自然语言控制与交互平台。用户通过语音或文本输入自然语言指令，系统利用大语言模型（LLM）进行意图理解和实体提取，将自然语言映射为结构化的车辆控制指令，同时支持自由对话交互。系统采用纯 LLM 方案替代传统 NLU 小模型，具备更强的语义理解能力、更低的维护成本和更好的泛化性。

## 二、需求分析

### 2.1 功能需求

| 功能域 | 子功能 | 示例指令 |
|--------|--------|---------|
| **车辆控制** | 空调控制 | "把空调调到24度"、"打开制冷模式"、"关闭空调" |
| | 车窗控制 | "把主驾车窗打开一半"、"关闭所有车窗" |
| | 座椅控制 | "座椅加热开到3挡"、"座椅往后调一点" |
| | 灯光控制 | "打开氛围灯"、"把氛围灯调成蓝色"、"关闭阅读灯" |
| | 后备箱 | "打开后备箱"、"关闭后备箱" |
| | 雨刮器 | "打开雨刮器"、"雨刮器调到最快" |
| **音乐控制** | 播放控制 | "播放音乐"、"暂停"、"下一首"、"上一首" |
| | 搜索播放 | "播放周杰伦的晴天"、"来一首轻音乐" |
| | 音量控制 | "音量调大一点"、"音量调到50%" |
| | 播放模式 | "随机播放"、"单曲循环" |
| **导航控制** | 目的地设置 | "导航到北京天安门"、"我要去最近的加油站" |
| | 路线规划 | "走高速"、"避开拥堵"、"换一条路线" |
| | 导航操作 | "取消导航"、"显示全程概览" |
| **智能对话** | 自由聊天 | "今天天气怎么样"、"给我讲个笑话" |
| | 车辆问答 | "我的车还剩多少电"、"续航还有多少公里" |
| | 多轮对话 | 上下文关联的连续对话 |

### 2.2 非功能需求

| 维度 | 要求 |
|------|------|
| **响应延迟** | 车控指令端到端 < 2 秒，对话响应首 token < 1 秒 |
| **准确率** | 意图识别准确率 > 95%，实体提取准确率 > 93% |
| **可用性** | 支持离线降级（基础车控），在线服务 SLA > 99.9% |
| **安全性** | 安全关键指令需二次确认，防止误操作 |
| **扩展性** | 新增车控功能无需重新训练模型，仅需更新配置 |
| **并发** | 支持单车实例 + 云端多车并发（按车辆分片） |

### 2.3 约束与假设

- **假设**：车辆底层已提供标准化的车控 API（CAN 总线网关或中间件封装）
- **假设**：语音识别（ASR）由独立模块完成，本系统接收文本输入
- **假设**：语音合成（TTS）由独立模块完成，本系统输出文本结果
- **约束**：车端算力有限，核心 LLM 推理部署在云端，车端运行轻量级代理
- **约束**：需要考虑弱网和断网场景的降级方案

## 三、系统架构设计

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         智能座舱终端 (Vehicle Edge)                   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ ASR 模块  │→│  NLC Client  │→│ 离线意图引擎  │→│  车控网关   │  │
│  │ (语音识别) │  │  (车端代理)   │  │ (降级模式)    │  │ (CAN/SOME/IP)│ │
│  └──────────┘  └──────┬───────┘  └──────────────┘  └──────┬─────┘  │
│                       │                                     │       │
│  ┌──────────┐         │         ┌──────────────┐           │       │
│  │ TTS 模块  │←────────┤         │  设备状态管理  │←──────────┘       │
│  │ (语音合成) │         │         │ (Vehicle State)│                  │
│  └──────────┘         │         └──────────────┘                    │
└───────────────────────┼─────────────────────────────────────────────┘
                        │ WebSocket / gRPC
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         云端服务 (Cloud Services)                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    API Gateway (Kong/Nginx)                  │    │
│  │              认证 / 限流 / 路由 / 负载均衡                     │    │
│  └────────────────────────┬────────────────────────────────────┘    │
│                           │                                         │
│  ┌────────────────────────▼────────────────────────────────────┐    │
│  │               NLC Core Service (核心服务)                     │    │
│  │                                                              │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │ 对话管理器   │  │  LLM 编排引擎 │  │  Function Router  │   │    │
│  │  │ Dialog Mgr   │→│ LLM Orchestr. │→│  (指令路由分发)    │   │    │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘   │    │
│  │         │                │                    │              │    │
│  │  ┌──────▼──────┐  ┌─────▼───────┐  ┌────────▼─────────┐   │    │
│  │  │ 会话上下文   │  │ Prompt 管理  │  │  域执行器集合     │   │    │
│  │  │ Context Store│  │ Prompt Mgr   │  │  Domain Executors │   │    │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                           │                                         │
│  ┌────────────┐  ┌───────▼──────┐  ┌──────────┐  ┌────────────┐   │
│  │ LLM Provider│  │  Redis/Cache  │  │ MongoDB  │  │ 消息队列    │   │
│  │ (多模型适配) │  │  会话/状态缓存 │  │ 日志/分析 │  │ (Kafka)    │   │
│  └────────────┘  └──────────────┘  └──────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 核心流程

```
用户语音 → ASR → 文本 → NLC Client → Cloud API Gateway
    → 对话管理器(加载上下文)
    → LLM 编排引擎(构建 Prompt + Function Calling)
    → LLM 推理(意图+实体+回复)
    → Function Router(指令分发)
    → Domain Executor(域执行器)
    → 车控网关(下发指令) + 回复文本
    → NLC Client → TTS → 语音播报
```

### 3.3 技术选型

| 层级 | 技术选择 | 理由 |
|------|---------|------|
| **后端语言** | TypeScript + Node.js (NestJS) | 类型安全、生态成熟、适合 I/O 密集型服务 |
| **车端代理** | Rust | 高性能、低资源占用、适合嵌入式环境 |
| **LLM 接入** | OpenAI API 兼容协议（支持多模型） | Function Calling 成熟、工具调用标准化 |
| **主要模型** | GPT-4o / Claude / 国产模型（如 Qwen、DeepSeek） | 多模型冗余，按场景选型 |
| **通信协议** | WebSocket (实时) + gRPC (高性能) | 低延迟双向通信 |
| **会话存储** | Redis | 高性能会话缓存、TTL 自动过期 |
| **持久存储** | PostgreSQL | 结构化数据（用户、车辆、配置） |
| **日志分析** | MongoDB + Elasticsearch | 对话日志、行为分析 |
| **消息队列** | Kafka | 异步指令分发、事件溯源 |
| **容器化** | Docker + Kubernetes | 弹性伸缩、服务编排 |
| **CI/CD** | GitHub Actions | 自动化构建、测试、部署 |
| **测试框架** | Vitest + Playwright | 单元/集成/E2E 测试 |
| **API 文档** | OpenAPI 3.0 (Swagger) | 标准化 API 文档 |

## 四、核心模块设计

### 4.1 项目目录结构

```
nlc/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── packages/
│   ├── shared/                          # 共享类型与工具
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── intent.ts            # 意图类型定义
│   │   │   │   ├── entity.ts            # 实体类型定义
│   │   │   │   ├── vehicle.ts           # 车辆状态类型
│   │   │   │   ├── command.ts           # 控制指令类型
│   │   │   │   ├── dialog.ts            # 对话相关类型
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── domains.ts           # 功能域常量
│   │   │   │   ├── intents.ts           # 意图枚举
│   │   │   │   └── errors.ts            # 错误码
│   │   │   ├── schemas/
│   │   │   │   ├── command.schema.ts    # 指令 Zod Schema
│   │   │   │   └── dialog.schema.ts     # 对话 Zod Schema
│   │   │   └── utils/
│   │   │       ├── result.ts            # Result<T, E> 类型
│   │   │       └── validation.ts        # 通用校验
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/                            # 核心服务
│   │   ├── src/
│   │   │   ├── main.ts                  # 应用入口
│   │   │   ├── app.module.ts
│   │   │   │
│   │   │   ├── dialog/                  # 对话管理模块
│   │   │   │   ├── dialog.module.ts
│   │   │   │   ├── dialog.service.ts    # 对话管理器
│   │   │   │   ├── dialog.controller.ts
│   │   │   │   ├── context/
│   │   │   │   │   ├── context.service.ts      # 上下文管理
│   │   │   │   │   └── context.repository.ts   # 上下文持久化
│   │   │   │   ├── session/
│   │   │   │   │   ├── session.service.ts      # 会话管理
│   │   │   │   │   └── session.repository.ts
│   │   │   │   └── dto/
│   │   │   │       ├── dialog-input.dto.ts
│   │   │   │       └── dialog-output.dto.ts
│   │   │   │
│   │   │   ├── llm/                     # LLM 编排模块
│   │   │   │   ├── llm.module.ts
│   │   │   │   ├── llm-orchestrator.service.ts  # LLM 编排引擎
│   │   │   │   ├── providers/
│   │   │   │   │   ├── llm-provider.interface.ts
│   │   │   │   │   ├── openai.provider.ts
│   │   │   │   │   ├── anthropic.provider.ts
│   │   │   │   │   └── qwen.provider.ts
│   │   │   │   ├── prompts/
│   │   │   │   │   ├── prompt-manager.service.ts
│   │   │   │   │   ├── system-prompt.ts         # 系统提示词
│   │   │   │   │   ├── vehicle-control.prompt.ts
│   │   │   │   │   ├── music.prompt.ts
│   │   │   │   │   ├── navigation.prompt.ts
│   │   │   │   │   └── chat.prompt.ts
│   │   │   │   ├── functions/
│   │   │   │   │   ├── function-registry.ts     # Function 注册表
│   │   │   │   │   ├── vehicle-control.functions.ts
│   │   │   │   │   ├── music.functions.ts
│   │   │   │   │   └── navigation.functions.ts
│   │   │   │   └── guardrails/
│   │   │   │       ├── safety-checker.service.ts  # 安全检查
│   │   │   │       └── output-validator.service.ts
│   │   │   │
│   │   │   ├── executor/                # 指令执行模块
│   │   │   │   ├── executor.module.ts
│   │   │   │   ├── function-router.service.ts   # 指令路由
│   │   │   │   ├── domains/
│   │   │   │   │   ├── domain-executor.interface.ts
│   │   │   │   │   ├── vehicle-control/
│   │   │   │   │   │   ├── vehicle-control.executor.ts
│   │   │   │   │   │   ├── ac.handler.ts        # 空调处理器
│   │   │   │   │   │   ├── window.handler.ts     # 车窗处理器
│   │   │   │   │   │   ├── seat.handler.ts       # 座椅处理器
│   │   │   │   │   │   └── light.handler.ts      # 灯光处理器
│   │   │   │   │   ├── music/
│   │   │   │   │   │   ├── music.executor.ts
│   │   │   │   │   │   ├── playback.handler.ts
│   │   │   │   │   │   └── search.handler.ts
│   │   │   │   │   └── navigation/
│   │   │   │   │       ├── navigation.executor.ts
│   │   │   │   │       ├── destination.handler.ts
│   │   │   │   │       └── route.handler.ts
│   │   │   │   └── adapters/
│   │   │   │       ├── vehicle-gateway.adapter.ts  # 车控网关适配
│   │   │   │       ├── music-service.adapter.ts    # 音乐服务适配
│   │   │   │       └── navi-service.adapter.ts     # 导航服务适配
│   │   │   │
│   │   │   ├── vehicle/                 # 车辆状态模块
│   │   │   │   ├── vehicle.module.ts
│   │   │   │   ├── vehicle-state.service.ts    # 车辆状态管理
│   │   │   │   ├── vehicle-state.repository.ts
│   │   │   │   └── dto/
│   │   │   │       └── vehicle-state.dto.ts
│   │   │   │
│   │   │   ├── gateway/                 # 通信网关模块
│   │   │   │   ├── gateway.module.ts
│   │   │   │   ├── ws.gateway.ts        # WebSocket 网关
│   │   │   │   └── grpc.gateway.ts      # gRPC 网关
│   │   │   │
│   │   │   └── common/                  # 公共设施
│   │   │       ├── config/
│   │   │       │   └── app.config.ts
│   │   │       ├── filters/
│   │   │       │   └── global-exception.filter.ts
│   │   │       ├── interceptors/
│   │   │       │   ├── logging.interceptor.ts
│   │   │       │   └── latency.interceptor.ts
│   │   │       └── middleware/
│   │   │           └── auth.middleware.ts
│   │   │
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   │   ├── dialog.service.spec.ts
│   │   │   │   ├── llm-orchestrator.spec.ts
│   │   │   │   ├── function-router.spec.ts
│   │   │   │   └── safety-checker.spec.ts
│   │   │   ├── integration/
│   │   │   │   ├── dialog-flow.spec.ts
│   │   │   │   ├── vehicle-control.spec.ts
│   │   │   │   └── music-control.spec.ts
│   │   │   └── e2e/
│   │   │       └── nlc-api.e2e-spec.ts
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── vehicle-client/                  # 车端代理（Rust）
│       ├── Cargo.toml
│       ├── src/
│       │   ├── main.rs
│       │   ├── client.rs                # 云端通信客户端
│       │   ├── offline_engine.rs        # 离线意图引擎
│       │   ├── vehicle_gateway.rs       # 车控网关接口
│       │   └── state_reporter.rs        # 状态上报
│       └── tests/
│
├── configs/
│   ├── prompts/                         # Prompt 模板（可热更新）
│   │   ├── system.md
│   │   ├── vehicle-control.md
│   │   ├── music.md
│   │   ├── navigation.md
│   │   └── chat.md
│   ├── functions/                       # Function 定义（可热更新）
│   │   ├── vehicle-control.json
│   │   ├── music.json
│   │   └── navigation.json
│   └── safety-rules.json               # 安全规则配置
│
├── docs/
│   ├── system-design.md                 # 本文档
│   ├── api-spec.md
│   ├── prompt-engineering.md
│   └── deployment.md
│
└── scripts/
    ├── setup.sh
    ├── seed-data.ts
    └── benchmark.ts
```

### 4.2 核心数据模型

#### 4.2.1 意图与实体类型

```typescript
// packages/shared/src/types/intent.ts

/** 功能域枚举 */
export const Domain = {
  VEHICLE_CONTROL: 'vehicle_control',
  MUSIC: 'music',
  NAVIGATION: 'navigation',
  CHAT: 'chat',
} as const

export type Domain = (typeof Domain)[keyof typeof Domain]

/** 车控子意图 */
export const VehicleControlIntent = {
  AC_SET_TEMPERATURE: 'ac_set_temperature',
  AC_SET_MODE: 'ac_set_mode',
  AC_TOGGLE: 'ac_toggle',
  WINDOW_OPEN: 'window_open',
  WINDOW_CLOSE: 'window_close',
  WINDOW_SET_POSITION: 'window_set_position',
  SEAT_HEAT_TOGGLE: 'seat_heat_toggle',
  SEAT_HEAT_SET_LEVEL: 'seat_heat_set_level',
  SEAT_VENTILATION_TOGGLE: 'seat_ventilation_toggle',
  SEAT_ADJUST_POSITION: 'seat_adjust_position',
  LIGHT_AMBIENT_TOGGLE: 'light_ambient_toggle',
  LIGHT_AMBIENT_SET_COLOR: 'light_ambient_set_color',
  LIGHT_READING_TOGGLE: 'light_reading_toggle',
  TRUNK_TOGGLE: 'trunk_toggle',
  WIPER_TOGGLE: 'wiper_toggle',
  WIPER_SET_SPEED: 'wiper_set_speed',
} as const

/** 音乐子意图 */
export const MusicIntent = {
  PLAY: 'play',
  PAUSE: 'pause',
  RESUME: 'resume',
  NEXT: 'next',
  PREVIOUS: 'previous',
  SEARCH_AND_PLAY: 'search_and_play',
  SET_VOLUME: 'set_volume',
  ADJUST_VOLUME: 'adjust_volume',
  SET_PLAY_MODE: 'set_play_mode',
} as const

/** 导航子意图 */
export const NavigationIntent = {
  SET_DESTINATION: 'set_destination',
  SEARCH_POI: 'search_poi',
  SET_ROUTE_PREFERENCE: 'set_route_preference',
  CANCEL_NAVIGATION: 'cancel_navigation',
  SHOW_OVERVIEW: 'show_overview',
  REROUTE: 'reroute',
} as const
```

#### 4.2.2 控制指令类型

```typescript
// packages/shared/src/types/command.ts

import { z } from 'zod'

/** 统一控制指令结构 */
export interface VehicleCommand {
  readonly id: string
  readonly domain: Domain
  readonly intent: string
  readonly parameters: Record<string, unknown>
  readonly confidence: number
  readonly requiresConfirmation: boolean
  readonly timestamp: number
}

/** 指令执行结果 */
export interface CommandResult {
  readonly commandId: string
  readonly success: boolean
  readonly message: string
  readonly executedAt: number
  readonly vehicleState?: Partial<VehicleState>
}

/** Zod 校验 Schema */
export const VehicleCommandSchema = z.object({
  id: z.string().uuid(),
  domain: z.enum(['vehicle_control', 'music', 'navigation', 'chat']),
  intent: z.string().min(1),
  parameters: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean(),
  timestamp: z.number(),
})
```

#### 4.2.3 对话模型

```typescript
// packages/shared/src/types/dialog.ts

/** 对话消息 */
export interface DialogMessage {
  readonly id: string
  readonly sessionId: string
  readonly role: 'user' | 'assistant' | 'system'
  readonly content: string
  readonly commands?: ReadonlyArray<VehicleCommand>
  readonly metadata: DialogMetadata
  readonly createdAt: number
}

/** 对话元数据 */
export interface DialogMetadata {
  readonly domain?: Domain
  readonly intent?: string
  readonly confidence?: number
  readonly latencyMs?: number
  readonly modelUsed?: string
  readonly tokenUsage?: TokenUsage
}

/** 会话 */
export interface Session {
  readonly id: string
  readonly vehicleId: string
  readonly userId: string
  readonly messages: ReadonlyArray<DialogMessage>
  readonly vehicleState: VehicleState
  readonly createdAt: number
  readonly lastActiveAt: number
  readonly expiresAt: number
}

/** Token 用量 */
export interface TokenUsage {
  readonly promptTokens: number
  readonly completionTokens: number
  readonly totalTokens: number
}
```

#### 4.2.4 车辆状态模型

```typescript
// packages/shared/src/types/vehicle.ts

/** 车辆完整状态 */
export interface VehicleState {
  readonly vehicleId: string
  readonly ac: AcState
  readonly windows: WindowsState
  readonly seats: SeatsState
  readonly lights: LightsState
  readonly music: MusicState
  readonly navigation: NavigationState
  readonly battery: BatteryState
  readonly updatedAt: number
}

export interface AcState {
  readonly isOn: boolean
  readonly temperature: number       // 16-32
  readonly mode: 'cool' | 'heat' | 'auto' | 'ventilation'
  readonly fanSpeed: number          // 1-7
  readonly isAutoMode: boolean
}

export interface WindowsState {
  readonly frontLeft: WindowPosition
  readonly frontRight: WindowPosition
  readonly rearLeft: WindowPosition
  readonly rearRight: WindowPosition
}

export interface WindowPosition {
  readonly isOpen: boolean
  readonly openPercentage: number    // 0-100
}

export interface SeatsState {
  readonly driver: SeatState
  readonly passenger: SeatState
  readonly rearLeft?: SeatState
  readonly rearRight?: SeatState
}

export interface SeatState {
  readonly heatingLevel: number      // 0-3 (0=off)
  readonly ventilationLevel: number  // 0-3 (0=off)
  readonly position: SeatPosition
}

export interface SeatPosition {
  readonly recline: number           // 0-100
  readonly distance: number          // 0-100
  readonly height: number            // 0-100
}

export interface LightsState {
  readonly ambientOn: boolean
  readonly ambientColor: string      // hex color
  readonly ambientBrightness: number // 0-100
  readonly readingLightOn: boolean
}

export interface MusicState {
  readonly isPlaying: boolean
  readonly currentTrack?: TrackInfo
  readonly volume: number            // 0-100
  readonly playMode: 'sequential' | 'shuffle' | 'repeat_one' | 'repeat_all'
}

export interface TrackInfo {
  readonly title: string
  readonly artist: string
  readonly album?: string
  readonly durationMs: number
  readonly positionMs: number
}

export interface NavigationState {
  readonly isNavigating: boolean
  readonly destination?: Location
  readonly remainingDistanceKm?: number
  readonly remainingTimeMin?: number
  readonly routePreference: 'fastest' | 'shortest' | 'no_highway' | 'no_toll'
}

export interface Location {
  readonly name: string
  readonly address: string
  readonly latitude: number
  readonly longitude: number
}

export interface BatteryState {
  readonly level: number             // 0-100 (%)
  readonly isCharging: boolean
  readonly estimatedRangeKm: number
  readonly chargingRemainingMin?: number
}
```

### 4.3 LLM 编排引擎设计

这是系统最核心的模块，负责将自然语言通过 LLM 转化为结构化指令。

#### 4.3.1 Prompt 工程策略

```markdown
# 系统提示词结构 (configs/prompts/system.md)

你是一个智能汽车座舱助手，名叫"小智"。你的职责是：
1. 理解用户的自然语言指令，将其转化为车辆控制操作
2. 与用户进行友好、自然的对话

## 行为准则
- 当用户发出车辆控制指令时，调用对应的 function
- 当用户进行闲聊时，直接回复自然语言
- 如果指令涉及安全操作（如行驶中开车门），必须拒绝并解释原因
- 参考当前车辆状态来给出合理的回复
- 使用简洁、友好的语气，回复不超过50字

## 当前车辆状态
{{vehicle_state}}

## 对话历史
{{conversation_history}}
```

#### 4.3.2 Function Calling 定义

```typescript
// packages/core/src/llm/functions/vehicle-control.functions.ts

export const vehicleControlFunctions = [
  {
    name: 'control_ac',
    description: '控制车辆空调系统，包括开关、温度、模式、风速设置',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['turn_on', 'turn_off', 'set_temperature', 'set_mode', 'set_fan_speed'],
          description: '空调操作类型',
        },
        temperature: {
          type: 'number',
          minimum: 16,
          maximum: 32,
          description: '目标温度（摄氏度），仅在 set_temperature 时需要',
        },
        mode: {
          type: 'string',
          enum: ['cool', 'heat', 'auto', 'ventilation'],
          description: '空调模式，仅在 set_mode 时需要',
        },
        fan_speed: {
          type: 'number',
          minimum: 1,
          maximum: 7,
          description: '风速等级，仅在 set_fan_speed 时需要',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'control_window',
    description: '控制车窗开关和位置',
    parameters: {
      type: 'object',
      properties: {
        position: {
          type: 'string',
          enum: ['front_left', 'front_right', 'rear_left', 'rear_right', 'all'],
          description: '车窗位置',
        },
        action: {
          type: 'string',
          enum: ['open', 'close', 'set_position'],
          description: '操作类型',
        },
        open_percentage: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: '开启百分比，仅在 set_position 时需要',
        },
      },
      required: ['position', 'action'],
    },
  },
  {
    name: 'control_seat',
    description: '控制座椅加热、通风和位置调节',
    parameters: {
      type: 'object',
      properties: {
        seat: {
          type: 'string',
          enum: ['driver', 'passenger', 'rear_left', 'rear_right'],
          description: '座椅位置',
        },
        action: {
          type: 'string',
          enum: [
            'heating_on', 'heating_off', 'set_heating_level',
            'ventilation_on', 'ventilation_off', 'set_ventilation_level',
            'adjust_position',
          ],
          description: '操作类型',
        },
        level: {
          type: 'number',
          minimum: 1,
          maximum: 3,
          description: '加热/通风等级',
        },
        position_adjustment: {
          type: 'object',
          properties: {
            direction: {
              type: 'string',
              enum: ['forward', 'backward', 'up', 'down', 'recline_forward', 'recline_backward'],
            },
            amount: {
              type: 'string',
              enum: ['small', 'medium', 'large'],
              description: '调整幅度',
            },
          },
        },
      },
      required: ['seat', 'action'],
    },
  },
  {
    name: 'control_light',
    description: '控制车内灯光，包括氛围灯和阅读灯',
    parameters: {
      type: 'object',
      properties: {
        light_type: {
          type: 'string',
          enum: ['ambient', 'reading'],
          description: '灯光类型',
        },
        action: {
          type: 'string',
          enum: ['turn_on', 'turn_off', 'set_color', 'set_brightness'],
          description: '操作类型',
        },
        color: {
          type: 'string',
          description: '颜色名称或十六进制值，仅在 set_color 时需要',
        },
        brightness: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: '亮度百分比，仅在 set_brightness 时需要',
        },
      },
      required: ['light_type', 'action'],
    },
  },
] as const
```

#### 4.3.3 LLM 编排引擎核心逻辑

```typescript
// packages/core/src/llm/llm-orchestrator.service.ts

export class LLMOrchestratorService {
  async processUserInput(input: DialogInput): Promise<DialogOutput> {
    // 1. 加载会话上下文
    const context = await this.contextService.getContext(input.sessionId)

    // 2. 获取当前车辆状态
    const vehicleState = await this.vehicleStateService.getState(input.vehicleId)

    // 3. 构建 Prompt
    const messages = this.promptManager.buildMessages({
      systemPrompt: this.promptManager.getSystemPrompt(),
      vehicleState,
      conversationHistory: context.messages,
      userMessage: input.text,
    })

    // 4. 获取可用 Functions
    const functions = this.functionRegistry.getAllFunctions()

    // 5. 调用 LLM
    const llmResponse = await this.llmProvider.chat({
      messages,
      functions,
      temperature: 0.3,     // 低温度保证指令准确性
      maxTokens: 512,
    })

    // 6. 处理 Function Calling 结果
    if (llmResponse.functionCalls && llmResponse.functionCalls.length > 0) {
      const commands = await this.processFunctionCalls(llmResponse.functionCalls)

      // 7. 安全检查
      const safeCommands = await this.safetyChecker.validate(commands, vehicleState)

      return {
        text: llmResponse.content ?? this.generateConfirmationText(safeCommands),
        commands: safeCommands,
        metadata: { /* ... */ },
      }
    }

    // 8. 纯对话回复
    return {
      text: llmResponse.content,
      commands: [],
      metadata: { /* ... */ },
    }
  }
}
```

### 4.4 安全保障设计

```typescript
// packages/core/src/llm/guardrails/safety-checker.service.ts

/** 安全规则定义 */
interface SafetyRule {
  readonly id: string
  readonly description: string
  readonly condition: (command: VehicleCommand, state: VehicleState) => boolean
  readonly action: 'block' | 'confirm' | 'warn'
  readonly message: string
}

const SAFETY_RULES: ReadonlyArray<SafetyRule> = [
  {
    id: 'no_window_while_driving_fast',
    description: '高速行驶时禁止大幅开窗',
    condition: (cmd, state) =>
      cmd.intent === 'window_open' &&
      (cmd.parameters.open_percentage as number) > 50 &&
      (state.speed ?? 0) > 80,
    action: 'block',
    message: '当前车速较快，为了安全不建议大幅开窗',
  },
  {
    id: 'confirm_all_windows',
    description: '一次性操作所有车窗需确认',
    condition: (cmd) =>
      cmd.intent.startsWith('window_') &&
      cmd.parameters.position === 'all',
    action: 'confirm',
    message: '确认要操作所有车窗吗？',
  },
  {
    id: 'temperature_extreme_warning',
    description: '极端温度提醒',
    condition: (cmd) =>
      cmd.intent === 'ac_set_temperature' &&
      ((cmd.parameters.temperature as number) <= 18 ||
       (cmd.parameters.temperature as number) >= 30),
    action: 'warn',
    message: '温度设置较为极端，已为您调整',
  },
]
```

## 五、API 设计

### 5.1 REST API

```yaml
# OpenAPI 3.0 规范摘要

paths:
  /api/v1/dialog:
    post:
      summary: 处理用户对话输入
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [sessionId, vehicleId, text]
              properties:
                sessionId:
                  type: string
                  format: uuid
                vehicleId:
                  type: string
                text:
                  type: string
                  maxLength: 500
                timestamp:
                  type: number
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      text:
                        type: string
                        description: 助手回复文本
                      commands:
                        type: array
                        items:
                          $ref: '#/components/schemas/VehicleCommand'
                      requiresConfirmation:
                        type: boolean
                      confirmationMessage:
                        type: string
                  meta:
                    type: object
                    properties:
                      latencyMs:
                        type: number
                      modelUsed:
                        type: string

  /api/v1/dialog/confirm:
    post:
      summary: 确认待执行的安全敏感指令
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [sessionId, commandId, confirmed]
              properties:
                sessionId:
                  type: string
                commandId:
                  type: string
                confirmed:
                  type: boolean

  /api/v1/dialog/stream:
    post:
      summary: 流式对话（SSE）
      description: 用于长回复的流式输出

  /api/v1/sessions/{sessionId}:
    get:
      summary: 获取会话信息
    delete:
      summary: 结束会话

  /api/v1/vehicle/{vehicleId}/state:
    get:
      summary: 获取车辆当前状态
    patch:
      summary: 更新车辆状态（车端上报）

  /api/v1/commands/{commandId}/result:
    post:
      summary: 上报指令执行结果（车端回调）
```

### 5.2 WebSocket API

```typescript
// WebSocket 事件定义

/** 客户端 → 服务端 */
interface ClientEvents {
  // 发送用户输入
  'dialog:input': {
    sessionId: string
    text: string
    timestamp: number
  }
  // 确认指令
  'command:confirm': {
    commandId: string
    confirmed: boolean
  }
  // 上报车辆状态
  'vehicle:state_update': Partial<VehicleState>
  // 心跳
  'ping': { timestamp: number }
}

/** 服务端 → 客户端 */
interface ServerEvents {
  // 助手回复（流式）
  'dialog:response_start': { messageId: string }
  'dialog:response_chunk': { messageId: string; chunk: string }
  'dialog:response_end': {
    messageId: string
    commands?: ReadonlyArray<VehicleCommand>
  }
  // 需要确认
  'command:confirm_required': {
    commandId: string
    message: string
  }
  // 指令下发
  'command:execute': VehicleCommand
  // 心跳回复
  'pong': { timestamp: number }
}
```

## 六、实现阶段划分

### Phase 1: 基础框架搭建（第 1-2 周）

| 步骤 | 任务 | 文件路径 | 复杂度 |
|------|------|---------|--------|
| 1.1 | 初始化 monorepo 项目结构 | `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json` | 低 |
| 1.2 | 创建 shared 包，定义所有类型 | `packages/shared/src/types/*.ts` | 中 |
| 1.3 | 定义 Zod 校验 Schema | `packages/shared/src/schemas/*.ts` | 低 |
| 1.4 | 搭建 NestJS 核心服务骨架 | `packages/core/src/main.ts`, `app.module.ts` | 中 |
| 1.5 | 实现全局异常过滤器和日志拦截器 | `packages/core/src/common/` | 低 |
| 1.6 | 配置 Docker Compose（Redis + PostgreSQL） | `docker-compose.yml` | 低 |
| 1.7 | 配置 Vitest 测试环境 | `vitest.config.ts` | 低 |
| 1.8 | 编写 shared 包单元测试 | `packages/shared/test/` | 低 |

**阶段产出**: 可运行的空白 NestJS 服务 + 完整类型系统 + 基础设施

### Phase 2: LLM 集成层（第 3-5 周）

| 步骤 | 任务 | 文件路径 | 复杂度 | 风险 |
|------|------|---------|--------|------|
| 2.1 | 实现 LLM Provider 接口和 OpenAI 适配器 | `packages/core/src/llm/providers/` | 中 | 中 |
| 2.2 | 实现 Anthropic Provider 适配器 | `packages/core/src/llm/providers/anthropic.provider.ts` | 中 | 低 |
| 2.3 | 实现 Prompt Manager，加载模板 | `packages/core/src/llm/prompts/` | 中 | 中 |
| 2.4 | 编写系统提示词和各域提示词 | `configs/prompts/*.md` | 高 | **高** |
| 2.5 | 实现 Function Registry，注册所有 Functions | `packages/core/src/llm/functions/` | 中 | 中 |
| 2.6 | 实现 LLM 编排引擎核心逻辑 | `packages/core/src/llm/llm-orchestrator.service.ts` | **高** | **高** |
| 2.7 | 实现安全检查器 | `packages/core/src/llm/guardrails/safety-checker.service.ts` | 中 | 中 |
| 2.8 | 实现输出校验器 | `packages/core/src/llm/guardrails/output-validator.service.ts` | 中 | 低 |
| 2.9 | LLM 层单元测试（Mock LLM） | `packages/core/test/unit/llm-orchestrator.spec.ts` | 中 | 低 |
| 2.10 | LLM 集成测试（真实调用） | `packages/core/test/integration/llm.spec.ts` | 中 | 中 |

**阶段产出**: 可接收文本输入、返回结构化指令和回复文本的 LLM 编排引擎

### Phase 3: 对话管理与会话系统（第 5-6 周）

| 步骤 | 任务 | 文件路径 | 复杂度 |
|------|------|---------|--------|
| 3.1 | 实现 Redis 会话存储 | `packages/core/src/dialog/session/` | 中 |
| 3.2 | 实现上下文管理（滑动窗口 + 摘要） | `packages/core/src/dialog/context/` | 高 |
| 3.3 | 实现对话管理器 | `packages/core/src/dialog/dialog.service.ts` | 高 |
| 3.4 | 实现对话 REST Controller | `packages/core/src/dialog/dialog.controller.ts` | 低 |
| 3.5 | 实现 WebSocket 网关 | `packages/core/src/gateway/ws.gateway.ts` | 中 |
| 3.6 | 实现流式响应（SSE） | 扩展 3.4 | 中 |
| 3.7 | 对话流程集成测试 | `packages/core/test/integration/dialog-flow.spec.ts` | 中 |

**阶段产出**: 完整的多轮对话系统，支持上下文保持和会话管理

### Phase 4: 指令执行与车辆控制（第 6-9 周）

| 步骤 | 任务 | 文件路径 | 复杂度 |
|------|------|---------|--------|
| 4.1 | 实现 Function Router（指令路由分发） | `packages/core/src/executor/function-router.service.ts` | 中 |
| 4.2 | 实现车控域执行器 + 各 Handler | `packages/core/src/executor/domains/vehicle-control/` | 高 |
| 4.3 | 实现音乐域执行器 | `packages/core/src/executor/domains/music/` | 中 |
| 4.4 | 实现导航域执行器 | `packages/core/src/executor/domains/navigation/` | 中 |
| 4.5 | 实现车控网关适配器（模拟） | `packages/core/src/executor/adapters/vehicle-gateway.adapter.ts` | 中 |
| 4.6 | 实现音乐服务适配器（模拟） | `packages/core/src/executor/adapters/music-service.adapter.ts` | 低 |
| 4.7 | 实现导航服务适配器（模拟） | `packages/core/src/executor/adapters/navi-service.adapter.ts` | 低 |
| 4.8 | 实现车辆状态管理服务 | `packages/core/src/vehicle/vehicle-state.service.ts` | 中 |
| 4.9 | 实现指令确认流程 | 扩展 3.3 + 4.1 | 中 |
| 4.10 | 车控端到端集成测试 | `packages/core/test/integration/vehicle-control.spec.ts` | 高 |

**阶段产出**: 完整的"自然语言 → LLM → 结构化指令 → 域执行器 → 适配器"通路

### Phase 5: 车端代理（第 9-11 周）

| 步骤 | 任务 | 文件路径 | 复杂度 | 风险 |
|------|------|---------|--------|------|
| 5.1 | 搭建 Rust 项目骨架 | `packages/vehicle-client/` | 低 | 低 |
| 5.2 | 实现 WebSocket 客户端（与云端通信） | `packages/vehicle-client/src/client.rs` | 中 | 中 |
| 5.3 | 实现车控网关接口（CAN/SOME-IP 桥接） | `packages/vehicle-client/src/vehicle_gateway.rs` | 高 | **高** |
| 5.4 | 实现车辆状态采集与上报 | `packages/vehicle-client/src/state_reporter.rs` | 中 | 中 |
| 5.5 | 实现离线意图引擎（基于规则匹配降级） | `packages/vehicle-client/src/offline_engine.rs` | 中 | 中 |
| 5.6 | 实现网络状态检测与自动切换 | 扩展 5.2 | 中 | 中 |
| 5.7 | 车端集成测试 | `packages/vehicle-client/tests/` | 高 | 中 |

**阶段产出**: 可部署到车机的轻量级代理，支持在线/离线双模式

### Phase 6: Prompt 调优与质量保障（第 5-12 周，持续进行）

| 步骤 | 任务 | 文件路径 | 复杂度 | 风险 |
|------|------|---------|--------|------|
| 6.1 | 构建评测数据集（500+ 测试用例） | `test-data/evaluation/` | 高 | 中 |
| 6.2 | 实现自动化评测 Pipeline | `scripts/benchmark.ts` | 中 | 低 |
| 6.3 | Prompt 迭代优化 | `configs/prompts/*.md` | **高** | **高** |
| 6.4 | Function 定义优化 | `configs/functions/*.json` | 高 | 中 |
| 6.5 | 多模型对比评测 | 扩展 6.2 | 中 | 低 |
| 6.6 | 边界场景覆盖测试 | 扩展 6.1 | 中 | 中 |

**阶段产出**: 意图识别准确率 > 95%，实体提取准确率 > 93%

### Phase 7: 部署与监控（第 12-14 周）

| 步骤 | 任务 | 文件路径 | 复杂度 |
|------|------|---------|--------|
| 7.1 | 编写 Dockerfile | `Dockerfile`, `packages/*/Dockerfile` | 低 |
| 7.2 | 编写 Kubernetes 部署配置 | `deploy/k8s/` | 中 |
| 7.3 | 配置 CI/CD Pipeline | `.github/workflows/` | 中 |
| 7.4 | 接入日志收集（ELK） | 扩展 common | 中 |
| 7.5 | 接入指标监控（Prometheus + Grafana） | `deploy/monitoring/` | 中 |
| 7.6 | 实现对话日志分析看板 | 新增 | 中 |
| 7.7 | 压力测试与性能调优 | `scripts/load-test.ts` | 中 |

**阶段产出**: 可生产部署的完整系统，含监控和告警

## 七、关键设计决策

### 7.1 为什么用 Function Calling 而不是让 LLM 直接输出 JSON

| 对比维度 | Function Calling | 直接输出 JSON |
|---------|-----------------|--------------|
| 结构可靠性 | 高（模型内置支持） | 中（可能格式错误） |
| 参数校验 | 自动（基于 Schema） | 需手动解析 |
| 多指令支持 | 原生支持 parallel | 需自行设计 |
| 模型兼容性 | 主流模型均支持 | 通用性更好 |
| 可扩展性 | 新增 Function 即可 | 需修改 Prompt |

**决策**: 优先使用 Function Calling，对不支持的模型降级为 JSON 模式。

### 7.2 上下文窗口管理策略

```
策略：滑动窗口 + 关键信息摘要

1. 保留最近 10 轮对话原文
2. 更早的对话通过 LLM 生成摘要
3. 车辆状态始终在 System Prompt 中注入
4. 总 Token 预算控制在 4K 以内（为回复留充足空间）
```

### 7.3 多指令并行处理

用户可能在一句话中包含多个指令，如："把空调调到24度，然后播放一首轻音乐"。

```
处理策略：
1. LLM 通过 parallel function calling 同时返回多个函数调用
2. Function Router 按域分组，独立域的指令并行执行
3. 同域内的指令按顺序执行（避免冲突）
4. 所有指令执行完毕后，合并结果统一回复
```

## 八、风险评估与缓解

### 8.1 技术风险

| 风险 | 等级 | 影响 | 缓解措施 |
|------|------|------|---------|
| LLM 意图识别准确率不达标 | **高** | 核心功能不可用 | 1) 迭代优化 Prompt 2) 增加 Few-shot 示例 3) 后处理校验 4) 多模型投票 |
| LLM API 延迟过高（>3s） | **高** | 用户体验差 | 1) 流式输出 2) 预加载车辆状态 3) LLM 响应缓存 4) 边缘部署小模型 |
| LLM 幻觉导致错误指令 | **高** | 安全隐患 | 1) 安全规则硬编码 2) 参数范围 Zod 校验 3) 关键操作二次确认 |
| 网络断连 | **中** | 功能降级 | 1) 离线规则引擎降级 2) 指令队列重试 3) 状态本地缓存 |
| LLM 服务商 API 变更 | **中** | 服务中断 | 1) Provider 抽象层 2) 多厂商冗余 3) 版本锁定 |
| 上下文窗口溢出 | **低** | 丢失对话历史 | 1) Token 计数控制 2) 摘要压缩 3) 超限截断 |

### 8.2 产品风险

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 方言/口语表达理解不佳 | **中** | 1) 在评测集中覆盖方言场景 2) Prompt 中增加口语化示例 |
| 模糊指令无法处理 | **中** | 1) 设计澄清对话流程 2) 基于车辆状态推断意图 |
| 用户期望超出系统能力 | **低** | 1) 优雅降级回复 2) 明确告知能力边界 |

## 九、测试策略

### 9.1 测试分层

```
┌──────────────────────────────────┐
│        E2E 测试 (10%)            │  全链路："打开空调" → 指令下发
├──────────────────────────────────┤
│      集成测试 (30%)              │  LLM + Router + Executor
├──────────────────────────────────┤
│      单元测试 (60%)              │  各 Service / Handler 独立测试
└──────────────────────────────────┘
```

### 9.2 LLM 专项评测

```typescript
// scripts/benchmark.ts 评测框架

interface TestCase {
  readonly input: string              // 用户输入
  readonly expectedDomain: Domain     // 期望域
  readonly expectedIntent: string     // 期望意图
  readonly expectedParams: Record<string, unknown>  // 期望参数
  readonly tags: ReadonlyArray<string>   // 标签（如 "方言", "多指令", "模糊"）
}

// 评测指标
interface BenchmarkResult {
  readonly totalCases: number
  readonly domainAccuracy: number     // 域识别准确率
  readonly intentAccuracy: number     // 意图识别准确率
  readonly parameterAccuracy: number  // 参数提取准确率
  readonly avgLatencyMs: number       // 平均延迟
  readonly p99LatencyMs: number       // P99 延迟
  readonly costPerRequest: number     // 单次请求成本
}
```

### 9.3 测试用例分类

| 类别 | 数量目标 | 示例 |
|------|---------|------|
| 标准指令 | 200+ | "空调调到25度" |
| 口语化表达 | 100+ | "有点冷，帮我暖和一下" |
| 多指令组合 | 50+ | "开空调、放首歌、导航去公司" |
| 模糊指令 | 50+ | "调一下座椅"（缺少具体参数） |
| 上下文相关 | 50+ | "再高一点"（承接上文座椅调节） |
| 拒绝/安全 | 30+ | "帮我关掉发动机"（行驶中） |
| 闲聊 | 50+ | "你叫什么名字" |
| 边界/异常 | 30+ | 空输入、超长输入、注入攻击 |

## 十、里程碑与时间线

```
Week 1-2   ████████████████  Phase 1: 基础框架搭建
Week 3-5   ████████████████████████  Phase 2: LLM 集成层
Week 5-6   ████████████████  Phase 3: 对话管理
Week 6-9   ████████████████████████  Phase 4: 指令执行
Week 9-11  ████████████████████████  Phase 5: 车端代理
Week 5-12  ████████████████████████████████████████  Phase 6: Prompt 调优（持续）
Week 12-14 ████████████████  Phase 7: 部署监控
           ─────────────────────────────────────────
           1  2  3  4  5  6  7  8  9  10 11 12 13 14
```

**总预计工期**: 14 周（约 3.5 个月），其中 Phase 6 与其他阶段并行进行

## 十一、成功标准

- [ ] 意图识别准确率 > 95%（基于 500+ 评测集）
- [ ] 实体/参数提取准确率 > 93%
- [ ] 端到端响应延迟 P95 < 2 秒（含 LLM 推理）
- [ ] 流式输出首 Token 延迟 < 1 秒
- [ ] 多轮对话上下文保持准确率 > 90%
- [ ] 安全规则零漏检（100% 拦截危险指令）
- [ ] 单元测试覆盖率 > 80%
- [ ] 离线降级模式覆盖 80% 高频车控指令
- [ ] 系统可用性 > 99.9%（排除 LLM 服务商故障）
- [ ] 支持至少 2 家 LLM 服务商无缝切换
