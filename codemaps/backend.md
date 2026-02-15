# 后端模块

> 更新时间: 2026-02-15

## 架构变更

**重大变更**: 从单一 Function Calling 架构重构为 **大模型中枢控制器架构**。

```
旧架构 (已弃用):
用户输入 → DialogManager → LLMOrchestrator → Function Calling → CommandExecutor

新架构 (当前):
用户输入 → NewDialogManager → CentralController(落域) → DomainRouter → DomainHandler → DomainModel(小模型) → CommandExecutor
```

## 模块划分

### 1. 核心抽象层 (`src/core/`)

```
types.ts              核心类型定义 (226 行)
 ├ DomainRouting      单领域路由结果 { domain, rewrittenQuery, confidence }
 ├ MultiIntentRouting 多意图路由 { routings[], isSequential }
 ├ DomainContext      领域处理上下文 { vehicleState, dialogHistory }
 ├ DomainResult       领域处理结果 { intent, slots, commands, ttsText }
 ├ Command            可执行指令 { type, params, domain, priority }
 ├ IntentResult       意图解析结果 { intent, slots, confidence }
 ├ DomainHandler      领域处理器接口
 ├ DomainModel        领域模型接口
 ├ CentralController  中枢控制器接口
 └ DomainRouter       领域路由器接口

domain-handler.ts     领域处理器基类 (144 行)
 ├ BaseDomainHandler  抽象基类
 │   ├ createResult()       创建成功结果
 │   ├ createEmptyResult()  创建空结果
 │   └ createCommand()      创建指令
 └ DomainHandlerRegistry    处理器注册表
     ├ register()           注册处理器
     ├ registerFactory()    注册工厂
     └ get()                获取处理器

domain-model.ts       领域模型基类 (258 行)
 ├ BaseDomainModel    抽象基类 (调用小模型)
 │   ├ callModel()          调用 LLM
 │   └ createIntentResult() 创建意图结果
 ├ SimpleDomainModel  简单实现 (Prompt + LLM)
 └ RuleBasedDomainModel 规则实现 (无 LLM)
```

### 2. 控制器层 (`src/controller/`)

```
central-controller.ts   中枢控制器 (280 行)
 ├ CentralControllerImpl
 │   ├ route()              落域识别 + 多意图拆分 + Query 改写
 │   ├ buildMessages()      构建请求消息
 │   ├ parseResponse()      解析 JSON 响应
 │   ├ validateRouting()    验证路由结果
 │   ├ validateDomain()     验证领域有效性
 │   └ createFallbackRouting() 创建兜底路由
 └ prompts/routing.md       落域 Prompt

domain-router.ts        领域路由器 (161 行)
 ├ DomainRouterImpl
 │   ├ registerHandler()    注册处理器
 │   ├ dispatch()           单路由分发
 │   ├ dispatchAll()        批量路由分发 (按优先级排序)
 │   ├ getDomainPriority()  领域优先级 (vehicle > music > nav > chat)
 │   └ isFullyConfigured()  检查完整性
 └ createDomainRouter()     工厂函数
```

### 3. 对话管理层 (`src/dialog/`)

```
new-dialog-manager.ts   新架构对话管理器 (247 行)
 ├ NewDialogManager
 │   ├ handleInput()        主入口
 │   │   ├ centralController.route()     大模型落域
 │   │   ├ domainRouter.dispatchAll()    领域路由
 │   │   ├ executeCommands()             执行指令
 │   │   └ generateTtsText()             生成 TTS
 │   ├ collectCommands()     收集所有指令
 │   ├ executeCommands()     执行指令
 │   ├ updateHistory()       更新历史
 │   ├ switchProvider()      切换模型
 │   └ getStateManager()     获取状态管理器

dialog-manager.ts       旧架构对话管理器 (203 行, 保留兼容)
 ├ DialogManager
 │   ├ handleInput()        Function Calling 流程
 │   ├ generateTtsFromChanges()  生成 TTS
 │   └ describeAction()     描述动作
```

### 4. 领域处理层 (`src/domains/`)

```
index.ts                领域模块导出
 └ createAllHandlers()  创建所有处理器工厂

vehicle/                车控领域
 ├ handler.ts           VehicleControlHandler (68 行)
 │   └ handle()         调用 model → 解析指令 → 生成 TTS
 ├ model.ts             VehicleDomainModel (197 行)
 │   └ parseIntent()    小模型意图提取
 ├ intent-parser.ts     parseIntentToCommands, generateTtsText
 └ prompts/vehicle.md   车控 Prompt

music/                  音乐领域
 ├ handler.ts           MusicHandler (65 行)
 ├ model.ts             MusicDomainModel (180 行)
 └ prompts/music.md     音乐 Prompt

navigation/             导航领域
 ├ handler.ts           NavigationHandler (65 行)
 ├ model.ts             NavigationDomainModel (170 行)
 └ prompts/navigation.md 导航 Prompt

chat/                   问答领域
 ├ handler.ts           ChatHandler (60 行)
 ├ model.ts             ChatDomainModel (160 行)
 ├ context-manager.ts   ContextManager (100 行)
 └ prompts/chat.md      问答 Prompt
```

### 5. 执行层 (`src/executor/`)

```
command-executor.ts     指令执行器 (23 行)
 └ execute()            遍历 ToolCall → VehicleStateManager.applyCommand()

vehicle-state.ts        车辆状态管理 (231 行)
 ├ VehicleStateManager
 │   ├ getState()           获取状态快照
 │   ├ reset()              重置默认值
 │   └ applyCommand()       应用指令 (分发到 handle*)
 │       ├ handleAc()           空调控制
 │       ├ handleWindow()       车窗控制
 │       ├ handleSeat()         座椅控制
 │       ├ handleLight()        灯光控制
 │       ├ handleTrunk()        后备箱控制
 │       ├ handleWiper()        雨刮控制
 │       ├ handleMusic()        音乐控制
 │       └ handleNavigation()   导航控制
```

### 6. LLM 层 (`src/llm/`)

```
providers/
 ├ index.ts             Provider 导出
 ├ gemini.ts            Gemini API 适配 (233 行)
 │   ├ GeminiProvider
 │   │   ├ chat()              调用 Gemini API
 │   │   ├ convertMessages()   消息格式转换
 │   │   ├ convertTools()      工具格式转换
 │   │   └ mergeConsecutiveRoles() 合并连续同角色
 │   └ 配置: gemini-3-flash-preview, temp=0.1-0.3
 │
 └ zhipu.ts             GLM API 适配 (90 行)
     └ ZhipuProvider.chat()

orchestrator.ts         (旧) LLM 编排 (101 行)
function-registry.ts    (旧) 工具注册表 (70 行)
functions/              (旧) 工具定义
 ├ vehicle.ts           6 个车控工具
 ├ music.ts             1 个音乐工具
 └ navigation.ts        1 个导航工具
prompt-builder.ts       (旧) Prompt 构建 (40 行)
```

### 7. Web 服务层 (`src/web/`)

```
server.ts               Fastify 服务器 (115 行)
 ├ createServer()
 │   ├ Fastify 实例 + 日志
 │   ├ CORS 插件
 │   ├ WebSocket 插件
 │   ├ AppContext (单用户模式)
 │   ├ registerApiRoutes()
 │   ├ registerWebSocketRoutes()
 │   ├ 静态文件服务 (web/dist)
 │   └ SPA 回退路由

routes/
 ├ api.ts               REST API 路由 (110 行)
 │   ├ GET  /api/state       获取车辆状态
 │   ├ POST /api/state/reset 重置状态
 │   ├ POST /api/dialog      发送对话
 │   ├ GET  /api/history     获取历史
 │   ├ DELETE /api/history   清除历史
 │   ├ POST /api/model       切换模型
 │   ├ GET  /api/model       获取当前模型
 │   └ GET  /api/health      健康检查
 │
 └ ws.ts                WebSocket 路由 (148 行)
     ├ GET /ws           WebSocket 连接
     ├ 消息类型:
     │   ├ dialog        对话消息
     │   ├ ping          心跳
     │   └ clear_context 清空上下文
     └ 响应类型:
         ├ init          初始状态
         ├ dialog        对话响应
         ├ state         状态更新
         ├ processing    处理中
         ├ error         错误
         └ context_cleared 上下文已清空
```

### 8. CLI 层 (`src/cli/`)

```
repl.ts                 REPL 交互 (148 行)
 ├ startRepl()          入口函数
 ├ handleCommand()      斜杠命令处理
 │   ├ /help    帮助信息
 │   ├ /state   车辆状态
 │   ├ /model   切换模型
 │   ├ /history 对话历史
 │   ├ /clear   清除历史
 │   ├ /reset   重置状态
 │   ├ /debug   调试信息
 │   └ /quit    退出
 └ createProvider()     Provider 工厂

renderer.ts             终端输出 (109 行)
 ├ renderBanner()       启动横幅
 ├ renderResult()       结果输出
 ├ renderVehicleState() 车辆状态
 ├ renderHelp()         帮助信息
 ├ renderHistory()      对话历史
 └ renderError()        错误信息
```

## 外部依赖

| 依赖 | 版本 | 用途 | 调用位置 |
|------|------|------|----------|
| `dotenv` | ^16.x | 环境变量 | config.ts |
| `zod` | ^3.x | 类型校验 | (预留) |
| `fastify` | ^5.x | Web 框架 | web/server.ts |
| `@fastify/cors` | ^10.x | CORS | web/server.ts |
| `@fastify/websocket` | ^11.x | WebSocket | web/server.ts |
| `@fastify/static` | ^8.x | 静态文件 | web/server.ts |
| `node:readline` | - | CLI 输入 | cli/repl.ts |
| `node:fs/path` | - | 文件操作 | 多处 |

## API 端点

### REST API

| 方法 | 路径 | 描述 | 请求体/响应 |
|------|------|------|-------------|
| GET | /api/state | 获取车辆状态 | `{ success, data: VehicleState }` |
| POST | /api/state/reset | 重置状态 | `{ success, message }` |
| POST | /api/dialog | 发送对话 | `{ message }` → `{ success, data: {...} }` |
| GET | /api/history | 获取历史 | `{ success, data: ChatMessage[] }` |
| DELETE | /api/history | 清除历史 | `{ success, message }` |
| POST | /api/model | 切换模型 | `{ model: "gemini"|"glm" }` |
| GET | /api/model | 获取模型 | `{ success, data: { model } }` |
| GET | /api/health | 健康检查 | `{ status, timestamp }` |

### WebSocket 消息

**客户端 → 服务器:**
```typescript
{ type: 'dialog', payload: { message: string } }
{ type: 'clear_context' }
{ type: 'ping' }
```

**服务器 → 客户端:**
```typescript
{ type: 'init', payload: { vehicleState, history, model } }
{ type: 'dialog', payload: { ttsText, stateChanges, domain, intent, slots, ... } }
{ type: 'state', payload: { vehicleState } }
{ type: 'processing', payload: { message } }
{ type: 'error', payload: { message } }
{ type: 'context_cleared', payload: { message } }
{ type: 'pong' }
```

## 新旧架构对比

| 方面 | 旧架构 (Function Calling) | 新架构 (中枢控制器) |
|------|---------------------------|---------------------|
| 落域方式 | LLM 直接返回函数调用 | 大模型先落域，小模型再提取 |
| 多意图 | 单次调用返回多函数 | 拆分为多个 Routing |
| Query 改写 | 无 | 大模型改写给小模型 |
| 领域扩展 | 修改 FunctionRegistry | 新增 DomainHandler |
| 模型选择 | 统一大模型 | 大模型 + 领域小模型 |
| 可测试性 | 端到端测试 | 分层测试 |
