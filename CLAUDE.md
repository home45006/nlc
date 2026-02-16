# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
# 开发
npm start              # CLI REPL 模式
npm run dev            # CLI 开发模式（热重载）
npm run web            # Web 服务器模式（端口 3000）
npm run web:dev        # Web 开发模式（热重载）

# 测试
npm test               # 运行单元测试
npm run test:watch     # 监听模式
npm run test:coverage  # 覆盖率报告（阈值 80%）
npm run test:smoke     # 冒烟测试（需要 API Key）
npm run test:e2e       # E2E 测试（需要 API Key）

# 前端
cd web && npm run dev  # 前端开发服务器（端口 5173）
```

## 核心架构

这是一个智能座舱自然语言控制系统 Demo，使用 **Function Calling** 架构将自然语言映射为结构化车辆控制指令。

### 数据流

```
用户输入 → DialogManager → LLMOrchestrator → LLM Provider
                              ↓
                         Function Calling
                              ↓
                     FunctionRegistry.resolve()
                              ↓
                       CommandExecutor
                              ↓
                     VehicleStateManager
                              ↓
                         状态变更 + TTS
```

### 核心模块

| 模块 | 职责 | 文件位置 |
|------|------|----------|
| DialogManager | 统一管理用户输入处理流程，维护对话历史（最多60条） | `src/dialog/dialog-manager.ts` |
| LLMOrchestrator | 构建 Prompt、调用 LLM、解析响应 | `src/llm/orchestrator.ts` |
| FunctionRegistry | 管理所有控制函数，将函数名映射到 Domain/Intent | `src/llm/function-registry.ts` |
| CommandExecutor | 执行 LLM 返回的指令（纯函数式设计） | `src/executor/command-executor.ts` |
| VehicleStateManager | 管理车辆状态（不可变状态设计） | `src/executor/vehicle-state.ts` |

### 函数分类

- `vehicleFunctions`: 车辆控制（空调、车窗、座椅、灯光、后备箱、雨刮器）
- `musicFunctions`: 音乐控制（播放、暂停、切歌、搜索、音量、模式）
- `navigationFunctions`: 导航控制（目的地、路线偏好、取消）

### LLM Provider

支持多模型切换，通过环境变量 `DEFAULT_MODEL` 配置：
- Google Gemini（默认）
- 智谱 GLM

## 开发规范

### 状态管理

所有状态变更必须返回新对象，禁止直接修改：

```typescript
// 错误：直接修改
state.ac.temperature = 24

// 正确：返回新对象
const newState = {
  ...state,
  ac: { ...state.ac, temperature: 24 }
}
```

### 新增控制功能

1. 在 `src/llm/functions/` 中定义新的 Function
2. 在 `FunctionRegistry` 中注册函数
3. 在 `CommandExecutor` 中添加执行逻辑
4. 在 `VehicleStateManager` 中添加状态定义
5. 编写单元测试

### 环境变量

必需配置在 `.env` 文件中：
- `GEMINI_API_KEY`: Google Gemini API Key
- `ZHIPU_API_KEY`: 智谱 GLM API Key（可选）
- `DEFAULT_MODEL`: 默认模型（gemini / glm）

## 双模式运行

- **CLI 模式** (`npm start`): REPL 交互式命令行，适合快速测试
- **Web 模式** (`npm run web`): HTTP + WebSocket 服务，配合 Vue 前端使用
