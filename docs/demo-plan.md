# NLC DEMO - 极简可行性验证原型

## 一、设计原则

- **极简**：无数据库、无框架、无外部基础设施，单文件可运行
- **纯内存**：所有状态（对话历史、车辆状态）存内存，重启即重置
- **命令行即车机**：命令行输入 = 车机语音输入（跳过 ASR/TTS）
- **聚焦验证**：只验证 LLM 的意图识别、实体提取、多轮对话能力

## 二、验证目标

1. 车控指令识别准确性（空调/车窗/座椅/灯光/音乐/导航）
2. 闲聊对话自然度
3. 知识查询能力
4. 领域/意图无缝切换
5. 多轮对话记忆（代词消解、相对调节、上下文承接）

## 三、架构

```
命令行输入 (readline)
    │
    ▼
DialogManager (对话管理)
  ├─ 维护对话历史 (内存数组, 最近20轮)
  ├─ 注入车辆状态到 System Prompt
  │
  ▼
LLMOrchestrator (编排引擎)
  ├─ 构建 Prompt (System + History + User)
  ├─ 注册 Function/Tool 定义
  ├─ 调用 LLM Provider
  │   ├─ GeminiProvider (Gemini 3 Flash)  ← 当前主力
  │   └─ ZhipuProvider (GLM)
  ├─ 解析响应 → 提取 domain/intent/slots
  │
  ▼
CommandExecutor (模拟执行)
  ├─ 更新内存中的 VehicleState
  ├─ 返回状态变更描述
  │
  ▼
输出渲染 → 打印识别结果 + TTS文本 + 状态变更
```

**零依赖基础设施**：无 Redis、无 PostgreSQL、无 Docker、无消息队列。

## 四、目录结构

```
nlc/
├── src/
│   ├── main.ts                  # 入口 + REPL
│   ├── config.ts                # 环境变量配置
│   │
│   ├── types/                   # 类型定义
│   │   ├── index.ts
│   │   ├── domain.ts            # Domain/Intent 枚举
│   │   ├── dialog.ts            # DialogOutput/ChatMessage
│   │   ├── vehicle.ts           # VehicleState
│   │   └── llm.ts               # Provider 相关类型
│   │
│   ├── llm/                     # LLM 核心
│   │   ├── orchestrator.ts      # 编排引擎
│   │   ├── prompt-builder.ts    # Prompt 构建
│   │   ├── function-registry.ts # Function 注册表
│   │   ├── providers/
│   │   │   ├── gemini.ts        # Google Gemini (主力)
│   │   │   └── zhipu.ts         # 智谱 GLM
│   │   └── functions/
│   │       ├── vehicle.ts       # 车控 Functions
│   │       ├── music.ts         # 音乐 Functions
│   │       └── navigation.ts    # 导航 Functions
│   │
│   ├── dialog/
│   │   └── dialog-manager.ts    # 对话管理 + 内存上下文
│   │
│   ├── executor/
│   │   ├── command-executor.ts  # 指令模拟执行
│   │   └── vehicle-state.ts     # 车辆状态(内存)
│   │
│   └── cli/
│       ├── repl.ts              # REPL 循环 + 命令处理
│       └── renderer.ts          # 输出格式化
│
├── prompts/
│   └── system.md                # 系统提示词
│
├── test/
│   ├── smoke-test.ts            # 冒烟测试 (5条)
│   └── e2e-test.ts              # 端到端验证 (17条)
│
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

约 **20 个源文件**。

## 五、依赖

```json
{
  "dependencies": {
    "dotenv": "^16.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",
    "@types/node": "^22.x"
  }
}
```

LLM API 调用使用 Node.js 内置 `fetch`，不额外安装 SDK。

**启动命令**: `npx tsx src/main.ts`

## 六、核心类型

### 6.1 Domain 与 Intent

```typescript
// src/types/domain.ts

export const Domain = {
  VEHICLE_CONTROL: 'vehicle_control',
  MUSIC: 'music',
  NAVIGATION: 'navigation',
  CHAT: 'chat',
} as const

export type DomainType = (typeof Domain)[keyof typeof Domain]
```

### 6.2 DialogOutput（每次交互的输出）

```typescript
// src/types/dialog.ts

export interface DialogOutput {
  readonly domain: DomainType
  readonly intent: string
  readonly slots: Record<string, unknown>
  readonly confidence: number
  readonly ttsText: string
  readonly hasCommand: boolean
  readonly meta: {
    readonly model: string
    readonly latencyMs: number
    readonly tokens: { prompt: number; completion: number }
  }
}
```

### 6.3 VehicleState（内存对象）

```typescript
// src/types/vehicle.ts

export interface VehicleState {
  readonly ac: { isOn: boolean; temperature: number; mode: string; fanSpeed: number }
  readonly windows: { frontLeft: number; frontRight: number; rearLeft: number; rearRight: number }
  readonly seats: { driverHeating: number; passengerHeating: number }
  readonly lights: { ambientOn: boolean; ambientColor: string; readingOn: boolean }
  readonly trunk: { isOpen: boolean }
  readonly wiper: { isOn: boolean; speed: string }
  readonly music: { isPlaying: boolean; track: string; volume: number; mode: string }
  readonly navigation: { isActive: boolean; destination: string }
  readonly battery: { level: number; rangeKm: number }
}
```

### 6.4 LLM Provider 接口

```typescript
// src/llm/providers/provider.ts

export interface LLMProvider {
  readonly name: string
  chat(request: ChatRequest): Promise<ChatResponse>
}

export interface ChatRequest {
  readonly messages: ReadonlyArray<{ role: string; content: string }>
  readonly tools?: ReadonlyArray<unknown>
  readonly temperature?: number
  readonly maxTokens?: number
}

export interface ChatResponse {
  readonly content: string | null
  readonly toolCalls: ReadonlyArray<{
    id: string
    function: { name: string; arguments: string }
  }>
  readonly usage: { promptTokens: number; completionTokens: number }
}
```

## 七、System Prompt

```markdown
你是"小智"，一个新能源智能汽车的座舱助手。

## 角色
1. 车辆控制大脑：理解用户指令，调用工具函数控制车辆
2. 智能助理：自然对话，回答问题

## 规则
- 车辆控制指令：必须调用对应工具函数
- 多个操作：同时调用多个函数
- 模糊指令：根据常识推断或礼貌询问
- 参考车辆当前状态做合理响应
- 回复简洁友好，50字以内
- 使用中文，不用emoji
- 理解代词("把它关了")、相对指令("再高一点")、省略("25度")

## 当前车辆状态
{{vehicle_state}}
```

## 八、Function Calling 定义

共 **6 个 Function**，覆盖全部功能域：

| Function | 域 | 操作 |
|----------|---|------|
| `control_ac` | 车控 | 开关、温度、模式、风速 |
| `control_window` | 车控 | 开关、位置、开度 |
| `control_seat` | 车控 | 加热、通风、调节 |
| `control_light` | 车控 | 氛围灯、阅读灯、颜色 |
| `control_music` | 音乐 | 播放、暂停、搜索、音量、模式 |
| `control_navigation` | 导航 | 目的地、路线偏好、取消 |

后备箱和雨刮器合并到 `control_ac` 的扩展中简化为独立小函数：

| Function | 操作 |
|----------|------|
| `control_trunk` | 开/关 |
| `control_wiper` | 开/关/速度 |

共 **8 个 Function**。

## 九、命令行交互

### 启动

```
═══════════════════════════════════════════
  NLC Demo v0.1 - 智能座舱语言控制系统
  模型: gemini-3-flash-preview | 输入 /help 查看帮助
═══════════════════════════════════════════

你> _
```

### 车控示例

```
你> 空调调到24度

───────── 识别结果 ─────────
  Domain: vehicle_control
  Intent: ac_set_temperature
  Slots:  { temperature: 24 }
────────────────────────────

小智> 好的，已将空调调至24度。

  [变更] 空调温度: 26°C → 24°C
  ⏱ 1.2s | gemini-3-flash-preview | 450+85 tokens
```

### 闲聊示例

```
你> 还剩多少电

───────── 识别结果 ─────────
  Domain: chat
  Intent: vehicle_query
  Slots:  {}
────────────────────────────

小智> 当前电量78%，预计续航320公里。

  ⏱ 0.9s | gemini-3-flash-preview | 380+42 tokens
```

### 多轮示例

```
你> 打开座椅加热
小智> 好的，已开启主驾座椅加热。

你> 调到3挡
小智> 好的，已将主驾座椅加热调至3挡。

你> 把它关了
小智> 好的，已关闭主驾座椅加热。
```

### 特殊命令

| 命令 | 功能 |
|------|------|
| `/help` | 帮助 |
| `/state` | 查看车辆状态 |
| `/model gemini` 或 `/model glm` | 切换模型 |
| `/history` | 查看对话历史 |
| `/clear` | 清除对话历史 |
| `/reset` | 重置车辆状态 |
| `/debug` | 开关调试模式 |
| `/eval <file>` | 批量评测 |
| `/quit` | 退出 |

## 十、评测用例（精选）

### 车控（10 条）

| 输入 | 期望 Function | 期望参数 |
|------|--------------|---------|
| "把空调调到24度" | control_ac | `{action:"set_temperature", temperature:24}` |
| "有点冷暖和一下" | control_ac | `{action:"set_mode", mode:"heat"}` |
| "关空调" | control_ac | `{action:"turn_off"}` |
| "主驾车窗开一半" | control_window | `{position:"front_left", action:"set_position", open_percentage:50}` |
| "所有车窗关上" | control_window | `{position:"all", action:"close"}` |
| "座椅加热3挡" | control_seat | `{seat:"driver", action:"set_heating_level", level:3}` |
| "氛围灯调成蓝色" | control_light | `{light_type:"ambient", action:"set_color", color:"蓝"}` |
| "打开后备箱" | control_trunk | `{action:"open"}` |
| "开雨刷" | control_wiper | `{action:"turn_on"}` |
| "窗户留个缝" | control_window | `{action:"set_position", open_percentage:~10}` |

### 音乐（4 条）

| 输入 | 期望参数 |
|------|---------|
| "播放周杰伦的晴天" | `{action:"search_and_play", query:"周杰伦 晴天"}` |
| "暂停" | `{action:"pause"}` |
| "声音小点" | `{action:"set_volume"}` |
| "单曲循环" | `{action:"set_play_mode", play_mode:"repeat_one"}` |

### 导航（3 条）

| 输入 | 期望参数 |
|------|---------|
| "导航到天安门" | `{action:"set_destination", destination:"天安门"}` |
| "走高速" | `{action:"set_route_preference", route_preference:"fastest"}` |
| "取消导航" | `{action:"cancel"}` |

### 多轮（4 组）

| 场景 | 轮次 |
|------|------|
| 代词消解 | "开空调" → "调到25度" → "把它关了" |
| 领域切换 | "开空调" → "放首歌" → "你叫啥" → "温度低一点" |
| 相对调节 | "音量30" → "大一点" → "再大一点" |
| 复合指令 | "开空调24度，放周杰伦的歌，导航去公司" |

## 十一、实现步骤

| 阶段 | 内容 | 工期 |
|------|------|------|
| **1. 骨架** | npm init, tsconfig, types, config, .env | 2h |
| **2. Provider** | Provider 接口 + Gemini 适配 + Zhipu 适配 | 4h |
| **3. Functions** | 8个 Function 定义 + Registry | 2h |
| **4. 编排引擎** | Prompt Builder + Orchestrator（核心） | 4h |
| **5. 对话+执行** | DialogManager + CommandExecutor + VehicleState | 3h |
| **6. CLI** | REPL + Renderer + Commands | 2h |
| **7. 联调** | 端到端测试 + Prompt 调优 + 历史格式修复 | 4-8h |
| **合计** | | **~3-4 天** |

## 十二、核心风险

| 风险 | 缓解 |
|------|------|
| Prompt 质量 → 识别率低 | 迭代调优，Function description 写充分 |
| Gemini/GLM Tool 格式差异 | Provider 抽象层隔离 |
| 口语/模糊表达识别差 | Prompt 中加口语化示例 |

## 十三、成功标准

- [x] `npx tsx src/main.ts` 一键启动
- [x] 输入自然语言 → 输出 Domain/Intent/Slots + TTS 文本
- [x] `/model` 切换模型（Gemini/GLM）
- [x] 车控/音乐/导航指令基本识别正确
- [x] 多轮对话保持上下文（"再高两度" 等相对指令）
- [x] 端到端测试 17/17 通过率 100%
