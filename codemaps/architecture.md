# 架构总览

> 更新时间: 2026-02-13 | 源文件: 20 | 测试文件: 2

## 系统定位

新能源智能座舱自然语言控制系统（CLI DEMO），通过 LLM Function Calling 实现意图识别、实体提取和车辆控制。

## 分层架构

```
┌─────────────────────────────────────┐
│  CLI 层 (src/cli/)                  │
│  repl.ts · renderer.ts             │
├─────────────────────────────────────┤
│  对话管理层 (src/dialog/)            │
│  dialog-manager.ts                  │
├──────────────┬──────────────────────┤
│  LLM 编排层   │  执行层              │
│  (src/llm/)  │  (src/executor/)     │
│  orchestrator│  command-executor    │
│  prompt-build│  vehicle-state       │
│  func-regist │                      │
│  providers/  │                      │
│  functions/  │                      │
├──────────────┴──────────────────────┤
│  类型层 (src/types/)                 │
│  domain · vehicle · llm · dialog    │
├─────────────────────────────────────┤
│  配置 (src/config.ts)               │
│  提示词 (prompts/system.md)          │
└─────────────────────────────────────┘
```

## 模块依赖图

```
main.ts
 └→ repl.ts
     ├→ DialogManager ─────────────────────┐
     │   ├→ LLMOrchestrator                │
     │   │   ├→ PromptBuilder              │
     │   │   │   └→ prompts/system.md      │
     │   │   ├→ FunctionRegistry           │
     │   │   │   ├→ vehicleFunctions (6)   │
     │   │   │   ├→ musicFunctions (1)     │
     │   │   │   └→ navigationFunctions (1)│
     │   │   └→ LLMProvider (接口)          │
     │   │       ├─ GeminiProvider          │
     │   │       └─ ZhipuProvider           │
     │   ├→ CommandExecutor ───────────────┤
     │   └→ VehicleStateManager ───────────┘
     ├→ GeminiProvider
     ├→ ZhipuProvider
     ├→ config
     └→ renderer.*()
```

## 请求处理流程

```
用户输入 (字符串)
    │
    ▼
DialogManager.handleInput()
    ├─ VehicleStateManager.getState()
    │
    ▼
LLMOrchestrator.process()
    ├─ PromptBuilder.buildMessages()   → ChatMessage[]
    ├─ FunctionRegistry.getAllTools()   → ToolDefinition[]
    ├─ LLMProvider.chat()              → ChatResponse
    └─ 解析: domain / intent / slots   → OrchestratorResult
    │
    ▼
分支: hasCommand?
    ├─ 是 → CommandExecutor.execute()  → StateChange[]
    │       generateTtsFromChanges()   → TTS 文本
    └─ 否 → 直接返回 LLM 文本回复
    │
    ▼
更新对话历史 (4条消息格式)
    │
    ▼
返回 DialogResult { output, stateChanges }
    │
    ▼
renderer.renderResult() → 终端输出
```

## 文件清单

| 路径 | 职责 | 行数 |
|------|------|------|
| `src/main.ts` | 入口 | ~5 |
| `src/config.ts` | 环境变量 | ~9 |
| `src/cli/repl.ts` | REPL + 命令 | ~148 |
| `src/cli/renderer.ts` | 输出格式化 | ~109 |
| `src/dialog/dialog-manager.ts` | 对话管理 + TTS 生成 | ~203 |
| `src/llm/orchestrator.ts` | LLM 编排 | ~101 |
| `src/llm/prompt-builder.ts` | Prompt 构建 | ~40 |
| `src/llm/function-registry.ts` | 工具注册表 | ~70 |
| `src/llm/providers/gemini.ts` | Gemini API 适配 | ~233 |
| `src/llm/providers/zhipu.ts` | GLM API 适配 | ~90 |
| `src/llm/functions/vehicle.ts` | 车控工具定义 (6) | ~200 |
| `src/llm/functions/music.ts` | 音乐工具定义 (1) | ~60 |
| `src/llm/functions/navigation.ts` | 导航工具定义 (1) | ~50 |
| `src/executor/command-executor.ts` | 指令执行 | ~23 |
| `src/executor/vehicle-state.ts` | 车辆状态管理 | ~231 |
| `src/types/*.ts` | 类型定义 (5 文件) | ~150 |
| `prompts/system.md` | 系统提示词 | ~43 |
| `test/smoke-test.ts` | 冒烟测试 | ~58 |
| `test/e2e-test.ts` | 端到端测试 | ~140 |

## 技术栈

- **运行时**: Node.js >= 18, tsx
- **语言**: TypeScript 5.7 (strict, ESM)
- **LLM**: Gemini 3 Flash Preview (主力), GLM-4-Plus (备选)
- **依赖**: dotenv, zod (仅 2 个运行时依赖)
- **基础设施**: 无 (纯内存, 无数据库/缓存/消息队列)
