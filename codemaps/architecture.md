# 架构总览

> 更新时间: 2026-02-15 | 源文件: 59 | 测试文件: 9 | 前端文件: 23

## 系统定位

新能源智能座舱自然语言控制系统 Demo，采用 **大模型中枢控制器架构**，将自然语言映射为结构化车辆控制指令。

**核心设计理念**：大模型作为中枢控制器，只负责落域识别和 Query 改写；领域内的小模型负责精细意图提取。

## 分层架构

```
┌─────────────────────────────────────────────────────────┐
│  前端层 (web/src/)                                       │
│  Vue 3 + Pinia + WebSocket 实时通信                      │
├─────────────────────────────────────────────────────────┤
│  Web 服务层 (src/web/)                                   │
│  Fastify + WebSocket + 静态文件服务                       │
├─────────────────────────────────────────────────────────┤
│  对话管理层 (src/dialog/)                                 │
│  NewDialogManager - 协调中枢控制器和领域路由               │
├─────────────────────────────────────────────────────────┤
│  控制器层 (src/controller/)                              │
│  CentralController (大模型落域+改写)                      │
│  DomainRouter (路由分发)                                  │
├──────────────────────┬──────────────────────────────────┤
│  领域处理层 (src/domains/) │  核心抽象层 (src/core/)      │
│  vehicle / music      │  DomainHandler 接口              │
│  navigation / chat    │  DomainModel 接口                │
│  Handler + Model      │  类型定义                        │
├──────────────────────┴──────────────────────────────────┤
│  执行层 (src/executor/)                                  │
│  CommandExecutor + VehicleStateManager                   │
├─────────────────────────────────────────────────────────┤
│  LLM 层 (src/llm/)                                       │
│  providers/gemini.ts + providers/zhipu.ts               │
├─────────────────────────────────────────────────────────┤
│  CLI 层 (src/cli/)                                       │
│  repl.ts + renderer.ts                                  │
├─────────────────────────────────────────────────────────┤
│  类型层 (src/types/)                                     │
│  domain · vehicle · llm · dialog                        │
└─────────────────────────────────────────────────────────┘
```

## 新架构数据流

```
用户输入
    │
    ▼
NewDialogManager.handleInput()
    │
    ├──────────────────────────────────────────┐
    │                                          │
    ▼                                          ▼
CentralController.route()              VehicleStateManager.getState()
(大模型落域 + 多意图拆分 + Query改写)          │
    │                                          │
    ▼                                          │
MultiIntentRouting                              │
{ routings: [{domain, rewrittenQuery, confidence}] }
    │                                          │
    ▼                                          │
DomainRouter.dispatchAll()  ◄──────────────────┘
    │
    ├──► VehicleControlHandler.handle()
    │         └──► VehicleDomainModel.parseIntent()
    │                   └──► 小模型意图提取
    │
    ├──► MusicHandler.handle()
    │         └──► MusicDomainModel.parseIntent()
    │
    ├──► NavigationHandler.handle()
    │         └──► NavigationDomainModel.parseIntent()
    │
    └──► ChatHandler.handle()
              └──► ChatDomainModel.parseIntent()
    │
    ▼
DomainResult { intent, slots, commands, ttsText }
    │
    ▼
CommandExecutor.execute()
    │
    ▼
VehicleStateManager.applyCommand()
    │
    ▼
StateChange[] + TTS 文本
    │
    ▼
返回 DialogResult
```

## 核心模块清单

| 模块 | 职责 | 文件位置 | 行数 |
|------|------|----------|------|
| **核心抽象** | | | |
| types | 核心类型定义 | src/core/types.ts | ~230 |
| domain-handler | 领域处理器基类 | src/core/domain-handler.ts | ~144 |
| domain-model | 领域模型基类 | src/core/domain-model.ts | ~258 |
| **控制器** | | | |
| central-controller | 大模型落域+改写 | src/controller/central-controller.ts | ~280 |
| domain-router | 领域路由分发 | src/controller/domain-router.ts | ~161 |
| **对话管理** | | | |
| new-dialog-manager | 新架构对话管理器 | src/dialog/new-dialog-manager.ts | ~247 |
| dialog-manager | (旧) 传统对话管理器 | src/dialog/dialog-manager.ts | ~203 |
| **领域处理** | | | |
| vehicle/handler | 车控处理器 | src/domains/vehicle/handler.ts | ~68 |
| vehicle/model | 车控小模型 | src/domains/vehicle/model.ts | ~197 |
| vehicle/intent-parser | 意图解析器 | src/domains/vehicle/intent-parser.ts | ~150 |
| music/handler | 音乐处理器 | src/domains/music/handler.ts | ~65 |
| music/model | 音乐小模型 | src/domains/music/model.ts | ~180 |
| navigation/handler | 导航处理器 | src/domains/navigation/handler.ts | ~65 |
| navigation/model | 导航小模型 | src/domains/navigation/model.ts | ~170 |
| chat/handler | 问答处理器 | src/domains/chat/handler.ts | ~60 |
| chat/model | 问答小模型 | src/domains/chat/model.ts | ~160 |
| chat/context-manager | 上下文管理 | src/domains/chat/context-manager.ts | ~100 |
| **执行层** | | | |
| command-executor | 指令执行器 | src/executor/command-executor.ts | ~23 |
| vehicle-state | 车辆状态管理 | src/executor/vehicle-state.ts | ~231 |
| **LLM 层** | | | |
| providers/gemini | Gemini API 适配 | src/llm/providers/gemini.ts | ~233 |
| providers/zhipu | GLM API 适配 | src/llm/providers/zhipu.ts | ~90 |
| orchestrator | (旧) LLM 编排 | src/llm/orchestrator.ts | ~101 |
| function-registry | (旧) 工具注册表 | src/llm/function-registry.ts | ~70 |
| **Web 服务** | | | |
| server | Fastify 服务器 | src/web/server.ts | ~115 |
| routes/api | REST API 路由 | src/web/routes/api.ts | ~110 |
| routes/ws | WebSocket 路由 | src/web/routes/ws.ts | ~148 |
| **CLI** | | | |
| repl | REPL 交互 | src/cli/repl.ts | ~148 |
| renderer | 终端输出 | src/cli/renderer.ts | ~109 |

## 技术栈

### 后端
- **运行时**: Node.js >= 18, tsx
- **语言**: TypeScript 5.7 (strict, ESM)
- **Web 框架**: Fastify 5.x
- **WebSocket**: @fastify/websocket
- **LLM**: Gemini 3 Flash (主力), GLM-4-Plus (备选)
- **依赖**: dotenv, zod

### 前端
- **框架**: Vue 3.5 + Vite 6.x
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **通信**: WebSocket (原生)
- **样式**: CSS Variables + 响应式设计

### 基础设施
- **存储**: 纯内存 (无数据库)
- **缓存**: 无
- **消息队列**: 无

## 领域划分

| 领域 | 类型标识 | 处理器 | 模型 |
|------|----------|--------|------|
| 车辆控制 | `vehicle_control` | VehicleControlHandler | VehicleDomainModel |
| 音乐控制 | `music` | MusicHandler | MusicDomainModel |
| 导航控制 | `navigation` | NavigationHandler | NavigationDomainModel |
| 智能问答 | `chat` | ChatHandler | ChatDomainModel |

## 双模式运行

- **CLI 模式** (`npm start`): REPL 交互式命令行
- **Web 模式** (`npm run web`): HTTP + WebSocket 服务，端口 3000

## 测试覆盖

| 测试类型 | 文件位置 | 数量 |
|----------|----------|------|
| 单元测试 | src/__tests__/ | 9 |
| 集成测试 | src/__tests__/integration/ | 1 |
| 冒烟测试 | test/smoke-test.ts | 1 |
| E2E 测试 | test/e2e-test.ts | 1 |

## 关键设计模式

1. **策略模式**: DomainHandler 接口允许多种领域处理器实现
2. **工厂模式**: createAllHandlers() 创建所有处理器
3. **模板方法**: BaseDomainHandler 提供通用处理流程
4. **不可变状态**: VehicleStateManager 返回新状态对象
5. **依赖注入**: LLMProvider 通过构造函数注入
