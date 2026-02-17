# 后端模块

> 更新时间: 2026-02-17

## 架构概述

**文件系统级 Skills V2 架构**：大模型负责意图识别和执行编排，Skill V2 系统负责能力管理和意图处理。

```
用户输入 -> NewDialogManager -> FileBasedSkillOrchestrator(意图识别) -> SkillExecutor(执行) -> CommandExecutor
```

## 模块划分

### 1. Skill V2 系统 (`src/skills/v2/`)

```
types.ts              V2 类型定义
 + SkillMetadataYaml  skill.yaml 元数据结构
 + CapabilityDefinition 能力定义
 + SlotDefinition     槽位定义
 + SkillInstructions  SKILL.md 指令结构
 + toSkillCapability() 类型转换函数

yaml-parser.ts        YAML 解析器
 + parseSimpleYaml()  简易 YAML 解析
 + parseValue()       值解析

skill-loader.ts       文件系统加载器
 + FileBasedSkill     文件系统级 Skill 类
 + SkillLoader        加载器类
 +   + loadAllSkills()       加载所有 Skills
 +   + loadMetadata()        加载 skill.yaml
 +   + loadInstructions()    加载 SKILL.md
 +   + loadExamples()        加载示例查询
 +   + scanSkills()          发现 Skills 目录

file-based-skill-registry.ts  Skill 注册表
 + FileBasedSkillRegistry
 +   + scanSkillsDirectory()  扫描目录
 +   + registerSkill()        注册 Skill
 +   + getCapabilityDescriptions() 生成能力描述
 +   + loadInstructions()     延迟加载指令
 +   + getAllSkills()         获取所有 Skill
 + 全局单例管理

skill-executor.ts     能力执行器
 + SkillExecutor
 +   + registerCapabilityHandler() 注册处理器
 +   + executeCapability()         执行能力
 +   + executeMultipleCapabilities() 并行执行
 +   + validateSlots()             槽位验证
 + CapabilityHandler    处理器函数类型

file-based-orchestrator.ts  编排器
 + FileBasedSkillOrchestrator
 +   + process()             主入口
 +   + recognizeIntents()    LLM 意图识别
 +   + executeIntents()      执行意图列表
 +   + buildIntentRecognitionPrompt() 构建 Prompt
 + OrchestrationResult  编排结果
 + OrchestratorContext  执行上下文
```

### 2. 通用 Skill 类型 (`src/skills/`)

```
types.ts              Skill 类型定义
 + SkillCapability    能力描述 { name, description, examples, slots }
 + CapabilitySlot     槽位定义 { name, type, required, enumValues }
 + SkillInput         输入 { originalQuery, rewrittenQuery, confidence }
 + SkillContext       上下文 { vehicleState, dialogHistory }
 + SkillResult        结果 { success, intent, slots, commands, ttsText }
 + Skill              接口 { id, name, domain, capabilities, execute }
 + SkillMetadata      元数据 { version, author, tags, priority }
 + RecognizedIntent   识别意图 { skillId, capability, confidence }
 + IntentRecognitionResult 意图识别结果

index.ts              Skill 模块入口
 + 导出 V2 所有组件
 + 兼容性别名
```

### 3. Skills 配置目录 (`skills/`)

```
skills/
+-- vehicle_control/
|   +-- skill.yaml       # 元数据和能力定义
|   |   + id: vehicle_control
|   |   + name: 车辆控制
|   |   + domain: vehicle_control
|   |   + capabilities:
|   |   |   + ac_control (空调)
|   |   |   + window_control (车窗)
|   |   |   + seat_control (座椅)
|   |   |   + light_control (灯光)
|   |   |   + trunk_control (后备箱)
|   |   + wiper_control (雨刮器)
|   |   + keywords: [空调, 温度, 车窗, ...]
|   +-- SKILL.md         # LLM 详细指令
|   +-- examples/        # 示例文件
|
+-- music/
|   +-- skill.yaml
|   |   + capabilities: play, pause, next, previous, search, volume, mode
|   +-- SKILL.md
|   +-- examples/
|
+-- navigation/
|   +-- skill.yaml
|   |   + capabilities: set_destination, set_route_preference, cancel
|   +-- SKILL.md
|   +-- examples/
|
+-- chat/
    +-- skill.yaml
    |   + capabilities: free_chat, vehicle_qa, weather_query
    +-- SKILL.md
    +-- examples/
```

### 4. 控制器层 (`src/controller/`)

```
central-controller.ts   中枢控制器
 + CentralControllerImpl
 +   + route()              落域识别 + 多意图拆分 + Query 改写
 +   + buildMessages()      构建请求消息
 +   + parseResponse()      解析 JSON 响应
 +   + validateRouting()    验证路由结果
 +   + createFallbackRouting() 创建兜底路由
 + CentralControllerConfig  配置接口
 + prompts/routing.md       落域 Prompt (可选加载)
```

### 5. 对话管理层 (`src/dialog/`)

```
new-dialog-manager.ts   对话管理器 (V2 架构)
 + NewDialogManager
 +   + handleInput()        主入口
 +   |   + FileBasedSkillOrchestrator.process()
 +   |   + executeCommands()             执行指令
 +   + initialize()          初始化
 +   + executeCommands()     执行指令
 +   + updateHistory()       更新历史
 +   + clearHistory()        清空历史
 +   + resetState()          重置状态
 +   + getStateManager()     获取状态管理器
 +   + getOrchestrator()     获取编排器
 + MAX_HISTORY_MESSAGES = 5  历史上限

dialog-manager.ts       旧架构对话管理器 (保留兼容)
```

### 6. 执行层 (`src/executor/`)

```
command-executor.ts     指令执行器
 + execute()            遍历 Command -> VehicleStateManager.applyCommand()

vehicle-state.ts        车辆状态管理
 + VehicleStateManager
 +   + getState()           获取状态快照
 +   + reset()              重置默认值
 +   + applyCommand()       应用指令
 +       + handleAc()           空调控制
 +       + handleWindow()       车窗控制
 +       + handleSeat()         座椅控制
 +       + handleLight()        灯光控制
 +       + handleTrunk()        后备箱控制
 +       + handleWiper()        雨刮控制
 +       + handleMusic()        音乐控制
 +       + handleNavigation()   导航控制
 + DEFAULT_VEHICLE_STATE   默认状态
```

### 7. LLM 层 (`src/llm/`)

```
providers/
 + gemini.ts            Gemini API 适配
 |   + GeminiProvider
 |   |   + chat()              调用 Gemini API
 |   |   + convertMessages()   消息格式转换
 |   |   + mergeConsecutiveRoles() 合并连续同角色
 |   + 配置: gemini-3-flash-preview, temp=0.1-0.3
 |
 + zhipu.ts             GLM API 适配
     + ZhipuProvider.chat()

orchestrator.ts         LLM 编排器
 + LLMOrchestrator
 +   + process()         处理用户输入
 +   + callWithFunctions() 调用带工具的请求

function-registry.ts    工具注册表
 + FunctionRegistry
 +   + register()        注册工具
 +   + getFunctions()    获取工具列表
 +   + execute()         执行工具

prompt-builder.ts       Prompt 构建器
 + buildSystemPrompt()   构建系统 Prompt
 + formatVehicleState()  格式化车辆状态

intent-rewriter.ts      意图改写器
 + IntentRewriter
 +   + rewrite()         改写意图
```

### 8. CLI 层 (`src/cli/`)

```
repl.ts                 REPL 交互
 + startRepl()          入口函数
 + selectModel()        模型选择
 + handleCommand()      斜杠命令处理
 |   + /help    帮助信息
 |   + /state   车辆状态
 |   + /model   切换模型
 |   + /history 对话历史
 |   + /clear   清除历史
 |   + /reset   重置状态
 |   + /debug   调试信息
 |   + /quit    退出
 + createProvider()     Provider 工厂

skill-repl.ts           Skill REPL
 + startSkillRepl()     V2 Skill 系统测试入口

renderer.ts             终端输出
 + renderBanner()       启动横幅
 + renderResult()       结果输出
 + renderVehicleState() 车辆状态
 + renderError()        错误信息

rewrite-cli.ts          Query 改写工具
 + main()               一语多意图改写测试
```

## 外部依赖

| 依赖 | 版本 | 用途 | 调用位置 |
|------|------|------|----------|
| `dotenv` | ^16.x | 环境变量 | config.ts |
| `node:readline` | - | CLI 输入 | cli/repl.ts |
| `node:fs/path` | - | 文件操作 | skills/v2/skill-loader.ts |

## 架构对比

| 方面 | V1 (代码级 Skill) | V2 (文件系统级 Skill) |
|------|-------------------|----------------------|
| 配置方式 | TypeScript 代码 | YAML + Markdown 文件 |
| 加载策略 | 一次性全部加载 | 三层渐进式披露 |
| Token 消耗 | 高（全部指令） | 低（按需加载） |
| 扩展性 | 修改代码重新编译 | 添加文件即可 |
| 可维护性 | 代码耦合 | 配置与逻辑分离 |
| 测试性 | 需要 Mock | 独立测试配置 |

## 三层加载详解

### 第一层：skill.yaml（启动时）

```yaml
# 元数据，用于意图识别
id: vehicle_control
name: 车辆控制
capabilities:
  - name: ac_control
    description: 空调控制
    examples: [打开空调, 温度调到24度]
    keywords: [空调, 温度]
```

### 第二层：SKILL.md（意图识别后）

```markdown
# 车辆控制

## ac_control - 空调控制

**参数：**
| 参数 | 类型 | 必需 | 描述 |
| action | enum | 是 | turn_on, turn_off, set_temperature |
| temperature | number | 否 | 16-32 |

**示例：**
- 打开空调 -> `{ action: "turn_on" }`
```

### 第三层：能力处理器（执行时）

```typescript
// 预注册的处理器函数
executor.registerCapabilityHandler('vehicle_control', 'ac_control', async (slots, context) => {
  // 实际执行逻辑
  return { success: true, commands: [...], ttsText: '...' }
})
```

## 主要数据流

### 1. 用户输入处理流程

```
用户输入
    |
    v
NewDialogManager.handleInput()
    |
    +-> orchestrator.process(userInput, context)
    |       |
    |       +-> recognizeIntents() - LLM 意图识别
    |       |       |
    |       |       +-> buildIntentRecognitionPrompt()
    |       |       +-> provider.chat()
    |       |       +-> parseIntentResponse()
    |       |
    |       +-> executeIntents() - 执行意图
    |               |
    |               +-> executor.executeCapability()
    |               +-> 收集 SkillResult
    |
    +-> executeCommands(result.commands)
    |       |
    |       +-> VehicleStateManager.applyCommand()
    |
    +-> updateHistory()
    |
    v
返回 DialogResult
```

### 2. Skill 加载流程

```
启动
    |
    v
FileBasedSkillOrchestrator.initialize()
    |
    +-> registry.scanSkillsDirectory()
    |       |
    |       +-> loader.scanSkills() - 扫描目录
    |       +-> loader.loadAllSkills() - 加载元数据
    |       |       |
    |       |       +-> loadMetadata() - 解析 skill.yaml
    |       |       +-> 创建 FileBasedSkill 对象
    |       |
    |       +-> registerSkill() - 注册到内存
    |
    +-> registerCapabilityHandlers() - 注册处理器
    |
    v
初始化完成
```

## 错误处理

### 编排器错误处理

```typescript
// 无意图识别时
if (!recognitionResult.success || recognitionResult.intents.length === 0) {
  return this.handleAsChat(userQuery, context)
}

// 执行失败时
return {
  success: false,
  response: '抱歉，处理您的请求时出现了问题。',
  skillResults: [],
  commands: [],
  error: errorMessage,
}
```

### Skill 执行器错误处理

```typescript
// 能力不存在
if (!handler) {
  return this.createErrorResult(
    `Unknown capability: ${skillId}.${capability}`,
    'UNKNOWN_CAPABILITY'
  )
}

// 执行异常
catch (error) {
  return this.createErrorResult(errorMessage, 'EXECUTION_ERROR')
}
```
