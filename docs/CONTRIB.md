# 开发指南

> 最后更新: 2026-02-17

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

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `GEMINI_API_KEY` | 是 | Google Gemini API Key | - |
| `ZHIPU_API_KEY` | 否 | 智谱 GLM API Key | - |
| `MINIMAX_API_KEY` | 否 | MiniMax API Key | - |
| `MINIMAX_MODEL` | 否 | MiniMax 模型 | `MiniMax-M2.5` |
| `DEFAULT_MODEL` | 否 | 默认模型选择 (`gemini`/`glm`/`minimax`) | `gemini` |

## 脚本命令

### 开发脚本

| 命令 | 说明 | 用途 |
|------|------|------|
| `npm start` | 启动交互式 REPL | CLI 生产模式运行（主入口） |
| `npm run dev` | 开发模式（热重载） | CLI 开发调试 |
| `npm run rewrite` | 一语多意图改写工具 | Query 改写测试 |

### 测试脚本

| 命令 | 说明 | 用途 |
|------|------|------|
| `npm test` | 运行单元测试 | Vitest 单次执行 |
| `npm run test:watch` | 监听模式 | 开发时实时测试 |
| `npm run test:coverage` | 覆盖率报告 | 生成覆盖率报告（阈值 80%） |
| `npm run test:smoke` | 冒烟测试 | 5 条基础用例验证 API 连通性 |

## 项目结构

```
nlc/
├── skills/                      # Skills 配置目录（V2 文件系统级）
│   ├── vehicle_control/
│   │   ├── skill.yaml           # 元数据和能力定义
│   │   ├── SKILL.md             # LLM 指令（延迟加载）
│   │   └── examples/            # 示例文件
│   ├── music/
│   ├── navigation/
│   └── chat/
├── src/
│   ├── main.ts                  # 入口
│   ├── config.ts                # 环境变量配置
│   ├── constants.ts             # 常量定义
│   ├── core/                    # 核心抽象层
│   │   ├── types.ts             # 核心类型定义
│   │   └── domain-handler.ts    # 领域处理器基类
│   ├── controller/              # 控制器层
│   │   ├── central-controller.ts # 大模型落域+改写
│   │   ├── domain-router.ts     # 领域路由分发
│   │   └── prompts/
│   │       └── routing.md       # 路由提示词
│   ├── dialog/                  # 对话管理
│   │   ├── new-dialog-manager.ts # 新架构对话管理器
│   │   └── dialog-manager.ts    # (旧) 传统对话管理器
│   ├── skills/                  # Skill 系统
│   │   ├── types.ts             # Skill 类型定义
│   │   ├── v2/                  # V2 文件系统级 Skills
│   │   │   ├── types.ts         # V2 类型定义
│   │   │   ├── file-based-orchestrator.ts  # 编排器
│   │   │   ├── file-based-skill-registry.ts # 注册表
│   │   │   ├── skill-executor.ts # 执行器
│   │   │   ├── skill-loader.ts  # 加载器
│   │   │   └── yaml-parser.ts   # YAML 解析器
│   │   └── index.ts             # 统一导出
│   ├── executor/                # 执行层
│   │   ├── command-executor.ts  # 指令执行器
│   │   └── vehicle-state.ts     # 车辆状态管理
│   ├── llm/                     # LLM 层
│   │   ├── orchestrator.ts      # LLM 编排
│   │   ├── function-registry.ts # 工具注册表
│   │   └── providers/
│   │       ├── gemini.ts        # Google Gemini
│   │       └── zhipu.ts         # 智谱 GLM
│   └── cli/                     # CLI 层
│       ├── repl.ts              # REPL 交互
│       ├── skill-repl.ts        # Skill REPL
│       ├── renderer.ts          # 输出渲染
│       └── rewrite-cli.ts       # Query 改写工具
├── test/
│   └── smoke-test.ts            # 冒烟测试
├── codemaps/                    # 架构文档
│   ├── architecture.md          # 总览
│   ├── backend.md               # 后端架构
│   └── data.md                  # 数据流
└── docs/
    ├── CONTRIB.md               # 本文件
    └── RUNBOOK.md               # 运维手册
```

## 核心架构

### 数据流（V2 Skills 架构）

```
用户输入
    │
    ▼
NewDialogManager.handleInput()
    │
    ├──────────────────────────────────────────┐
    │                                          │
    ▼                                          ▼
FileBasedSkillOrchestrator              VehicleStateManager.getState()
    │
    ├─► 第一层：加载 skill.yaml 元数据
    │
    ├─► LLM 意图识别（使用元数据构建 Prompt）
    │
    ├─► 第二层：按需加载 SKILL.md 指令
    │
    ├─► SkillExecutor 执行能力
    │       │
    │       └─► 第三层：调用能力处理器
    │
    ▼
CommandExecutor.execute()
    │
    ▼
VehicleStateManager.applyCommand()
    │
    ▼
状态变更 + TTS 文本
```

### Skill V2 系统

文件系统级 Skills 采用渐进式披露设计：

#### 三层加载策略

| 层级 | 文件 | 加载时机 | Token 消耗 | 用途 |
|------|------|----------|------------|------|
| 第一层 | `skill.yaml` | 启动时 | ~50 tokens/skill | 元数据和能力定义 |
| 第二层 | `SKILL.md` | 意图识别后 | ~500 tokens/skill | LLM 详细指令 |
| 第三层 | 能力处理器 | 执行时 | - | 实际执行逻辑 |

#### skill.yaml 结构

```yaml
id: vehicle_control              # Skill 唯一标识
name: 车辆控制                   # 显示名称
description: 控制车辆各项功能    # 描述
domain: vehicle_control          # 所属领域
version: "1.0.0"                 # 版本
priority: 1                      # 优先级（越小越高）
enabled: true                    # 是否启用
tags:                            # 标签
  - vehicle
  - control

capabilities:                    # 能力列表
  - name: ac_control             # 能力名称
    description: 空调控制        # 能力描述
    examples:                    # 示例语句
      - 打开空调
      - 温度调到24度
    slots:                       # 参数定义
      - name: action
        type: enum
        required: true
        enumValues:
          - turn_on
          - turn_off
      - name: temperature
        type: number
        required: false
        min: 16
        max: 32
    keywords:                    # 关键词
      - 空调
      - 温度
```

#### SKILL.md 结构

```markdown
# 车辆控制

控制车辆各项硬件功能...

## 能力描述

### ac_control - 空调控制

控制空调开关、温度、模式和风速。

**参数：**
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|

**示例：**
- 打开空调 -> `{ action: "turn_on" }`
```

## 开发流程

### 添加新的 Skill（V2）

1. 在 `skills/` 下创建新目录

```bash
mkdir -p skills/my_skill/examples
```

2. 创建 `skill.yaml`

```yaml
id: my_skill
name: 我的技能
description: 技能描述
domain: my_domain
version: "1.0.0"
priority: 100
enabled: true

capabilities:
  - name: my_capability
    description: 能力描述
    examples:
      - 示例语句1
      - 示例语句2
    slots:
      - name: param1
        type: string
        required: true
    keywords:
      - 关键词1
```

3. 创建 `SKILL.md`

```markdown
# 我的技能

技能详细描述...

## 能力描述

### my_capability - 能力名称

详细能力说明...

**参数：**
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|

**示例：**
- 示例1 -> `{ param1: "value" }`
```

4. 在 `SkillExecutor` 中注册能力处理器

```typescript
// src/skills/v2/skill-executor.ts
executor.registerHandler('my_skill', 'my_capability', async (params, context) => {
  // 实现逻辑
  return {
    success: true,
    commands: [...],
    ttsText: '执行成功'
  }
})
```

5. 编写单元测试

```typescript
// src/__tests__/skills/v2/my-skill.test.ts
describe('MySkill', () => {
  it('should handle my_capability', async () => {
    // 测试逻辑
  })
})
```

### 添加新的 LLM Provider

1. 在 `src/llm/providers/` 下创建新文件
2. 实现 `LLMProvider` 接口
3. 在 `src/cli/repl.ts` 的 `createProvider()` 中注册
4. 在 `.env.example` 中添加 API Key 变量

### 修改路由提示词

编辑 `src/controller/prompts/routing.md`，或使用 Skill 系统动态构建。

## 测试

### 测试覆盖

| 模块 | 测试文件 | 说明 |
|------|----------|------|
| Skills V2 | `skills/v2/*.test.ts` | YAML 解析、加载、编排、执行 |
| Skills 通用 | `skills/*.test.ts` | 类型、集成测试 |
| 控制器 | `controller/*.test.ts` | 路由、中枢控制器 |
| 对话管理 | `dialog/*.test.ts` | 历史管理、多轮对话 |
| LLM | `llm/*.test.ts` | 编排、函数注册 |
| 执行器 | `executor/*.test.ts` | 指令执行、状态管理 |

### 运行测试

```bash
# 单元测试
npm test

# 覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch

# 冒烟测试（需要 API Key）
npm run test:smoke
```

## 技术要点

### 不可变状态

所有状态变更必须返回新对象：

```typescript
// 错误：直接修改
state.ac.temperature = 24

// 正确：返回新对象
const newState = {
  ...state,
  ac: { ...state.ac, temperature: 24 }
}
```

### Gemini 多轮 Function Calling 格式

历史记录必须使用 4 条消息格式：

```
user → assistant(functionCall) → tool(result) → assistant(text确认)
```

### 渐进式披露

V2 Skills 的三层加载策略优化 Token 消耗：

- **启动时**：只加载所有 `skill.yaml`（~200 tokens for 4 skills）
- **意图识别后**：加载匹配 Skill 的 `SKILL.md`（~500 tokens per skill）
- **执行时**：调用预注册的能力处理器

## 相关文档

- [架构总览](../codemaps/architecture.md)
- [运维手册](./RUNBOOK.md)
