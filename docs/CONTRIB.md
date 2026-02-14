# 开发指南

## 环境准备

### 前置条件

- Node.js >= 18
- npm 或 pnpm

### 安装

```bash
npm install
```

### 环境变量

复制 `.env.example` 为 `.env` 并填写 API Key：

```bash
cp .env.example .env
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `GEMINI_API_KEY` | 是（默认模型） | Google Gemini API Key |
| `ZHIPU_API_KEY` | 否 | 智谱 GLM API Key |
| `CLAUDE_API_KEY` | 否 | Claude API Key（Provider 未实现） |
| `DEFAULT_MODEL` | 否 | 默认模型：`gemini`（默认）/ `glm` / `claude` |

## 脚本命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动交互式 REPL（`tsx src/main.ts`） |
| `npm run dev` | 开发模式，文件变更自动重启（`tsx watch src/main.ts`） |
| `npx tsx test/smoke-test.ts` | 冒烟测试（5 条基础用例） |
| `npx tsx test/e2e-test.ts` | 端到端验证测试（17 条用例，含多轮对话） |

## 项目结构

```
nlc/
├── src/
│   ├── main.ts                  # 入口
│   ├── config.ts                # 环境变量配置
│   ├── types/                   # 类型定义
│   │   ├── index.ts             # 统一导出
│   │   ├── domain.ts            # Domain/Intent 枚举
│   │   ├── dialog.ts            # DialogOutput/StateChange
│   │   ├── vehicle.ts           # VehicleState + 默认值
│   │   └── llm.ts               # LLMProvider/ChatMessage/ToolCall
│   ├── llm/                     # LLM 核心
│   │   ├── orchestrator.ts      # 编排引擎
│   │   ├── prompt-builder.ts    # System Prompt 构建
│   │   ├── function-registry.ts # Function 注册表
│   │   ├── providers/
│   │   │   ├── gemini.ts        # Google Gemini Provider
│   │   │   └── zhipu.ts         # 智谱 GLM Provider
│   │   └── functions/
│   │       ├── vehicle.ts       # 车控 Functions (6个)
│   │       ├── music.ts         # 音乐 Function
│   │       └── navigation.ts    # 导航 Function
│   ├── dialog/
│   │   └── dialog-manager.ts    # 对话管理 + TTS 生成
│   ├── executor/
│   │   ├── command-executor.ts  # 指令执行器
│   │   └── vehicle-state.ts     # 车辆状态管理（内存）
│   └── cli/
│       ├── repl.ts              # REPL 循环 + 命令处理
│       └── renderer.ts          # 输出格式化
├── prompts/
│   └── system.md                # 系统提示词模板
├── test/
│   ├── smoke-test.ts            # 冒烟测试
│   └── e2e-test.ts              # 端到端验证测试
├── docs/
│   ├── system-design.md         # 完整系统设计文档
│   ├── demo-plan.md             # DEMO 计划
│   ├── CONTRIB.md               # 开发指南（本文件）
│   └── RUNBOOK.md               # 运维手册
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

共 **20 个源文件**，约 **1500 行**代码。

## 开发流程

### 添加新的 LLM Provider

1. 在 `src/llm/providers/` 下创建新文件，实现 `LLMProvider` 接口
2. 在 `src/cli/repl.ts` 的 `createProvider()` 中注册
3. 在 `.env.example` 中添加对应的 API Key 变量

### 添加新的车控 Function

1. 在 `src/llm/functions/` 下创建或编辑定义文件
2. 在 `src/llm/function-registry.ts` 中注册函数和 domain/intent 映射
3. 在 `src/executor/vehicle-state.ts` 中添加状态处理逻辑
4. 在 `src/dialog/dialog-manager.ts` 的 `describeAction()` 中添加中文 TTS 描述
5. 在 `src/types/vehicle.ts` 中扩展 `VehicleState` 类型（如需要）

### 修改系统提示词

编辑 `prompts/system.md`，支持 `{{vehicle_state}}` 占位符注入当前车辆状态。

## 测试

```bash
# 冒烟测试 - 验证 API 连通性和基础识别
npx tsx test/smoke-test.ts

# 端到端测试 - 验证全链路（含多轮对话、领域切换、TTS 生成）
npx tsx test/e2e-test.ts
```

### 测试覆盖的场景

| 场景 | 用例数 |
|------|--------|
| 基础车控指令（空调/车窗/后备箱） | 4 |
| 音乐与导航 | 3 |
| 闲聊与知识查询 | 3 |
| 多轮对话记忆（上下文承接） | 3 |
| 领域无缝切换 | 4 |
| **合计** | **17** |

## 技术要点

### Gemini 多轮 Function Calling 格式

历史记录必须使用 4 条消息格式，否则后续 function calling 会失败：

```
user → assistant(functionCall) → tool(result) → assistant(text确认)
```

### TTS 文本生成

Gemini 在返回 functionCall 时不返回 text content，由 `DialogManager.generateTtsFromChanges()` 基于工具调用参数规则生成中文 TTS 文本。

### 不可变状态

`VehicleStateManager` 使用不可变模式更新状态（`{ ...this.state, field: newValue }`），每次变更都创建新对象。
