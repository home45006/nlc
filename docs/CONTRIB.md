# 开发指南

> 最后更新: 2026-02-15

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

| 变量 | 必填 | 说明 | 示例值 |
|------|------|------|--------|
| `GEMINI_API_KEY` | 是（默认模型） | Google Gemini API Key | `your_api_key_here` |
| `ZHIPU_API_KEY` | 否 | 智谱 GLM API Key | `your_zhipu_key` |
| `CLAUDE_API_KEY` | 否 | Claude API Key | `your_claude_key` |
| `DEFAULT_MODEL` | 否 | 默认模型选择 | `gemini`（默认）/ `glm` / `claude` |

## 脚本命令

### 后端脚本

| 命令 | 说明 | 用途 |
|------|------|------|
| `npm start` | 启动交互式 REPL | CLI 生产模式运行 |
| `npm run dev` | 开发模式（热重载） | CLI 开发调试 |
| `npm run web` | 启动 Web 服务器 | Web 生产模式（端口 3000） |
| `npm run web:dev` | Web 开发模式 | Web 开发调试（热重载） |
| `npm run web:build` | 构建前端 | 生成静态文件到 web/dist |

### 测试脚本

| 命令 | 说明 | 用途 |
|------|------|------|
| `npm test` | 运行单元测试 | Vitest 单次执行 |
| `npm run test:watch` | 监听模式 | 开发时实时测试 |
| `npm run test:coverage` | 覆盖率报告 | 生成覆盖率报告（阈值 80%） |
| `npm run test:smoke` | 冒烟测试 | 5 条基础用例验证 API 连通性 |
| `npm run test:e2e` | 端到端测试 | 17 条完整链路测试 |

### 前端脚本

在 `web/` 目录下执行：

| 命令 | 说明 | 用途 |
|------|------|------|
| `npm run dev` | 前端开发服务器 | 端口 5173，热重载 |
| `npm run build` | 构建生产版本 | 类型检查 + 打包 |
| `npm run preview` | 预览生产构建 | 本地验证构建结果 |
| `npm run test:e2e` | Playwright E2E 测试 | 前端 E2E 测试 |
| `npm run test:e2e:ui` | E2E 测试 UI 模式 | 可视化调试测试 |
| `npm run test:e2e:debug` | E2E 调试模式 | 逐步调试 |
| `npm run test:e2e:headed` | 有头模式运行 | 查看浏览器操作 |
| `npm run test:e2e:report` | 查看测试报告 | HTML 报告查看 |
| `npm run test:e2e:codegen` | 生成测试代码 | 录制测试用例 |

## 项目结构

```
nlc/
├── src/
│   ├── main.ts                  # 入口
│   ├── config.ts                # 环境变量配置
│   ├── constants.ts             # 常量定义
│   ├── core/                    # 核心抽象层
│   │   ├── types.ts             # 核心类型定义
│   │   ├── domain-handler.ts    # 领域处理器基类
│   │   └── domain-model.ts      # 领域模型基类
│   ├── controller/              # 控制器层
│   │   ├── central-controller.ts # 大模型落域+改写
│   │   ├── domain-router.ts     # 领域路由分发
│   │   └── prompts/
│   │       └── routing.md       # 路由提示词
│   ├── dialog/                  # 对话管理
│   │   ├── new-dialog-manager.ts # 新架构对话管理器
│   │   └── dialog-manager.ts    # (旧) 传统对话管理器
│   ├── domains/                 # 领域处理层
│   │   ├── vehicle/             # 车辆控制
│   │   │   ├── handler.ts       # 处理器
│   │   │   ├── model.ts         # 领域模型
│   │   │   ├── intent-parser.ts # 意图解析
│   │   │   └── prompts/
│   │   │       └── vehicle.md   # 车控提示词
│   │   ├── music/               # 音乐控制
│   │   │   ├── handler.ts
│   │   │   ├── model.ts
│   │   │   └── prompts/music.md
│   │   ├── navigation/          # 导航控制
│   │   │   ├── handler.ts
│   │   │   ├── model.ts
│   │   │   └── prompts/navigation.md
│   │   └── chat/                # 智能问答
│   │       ├── handler.ts
│   │       ├── model.ts
│   │       ├── context-manager.ts
│   │       └── prompts/chat.md
│   ├── executor/                # 执行层
│   │   ├── command-executor.ts  # 指令执行器
│   │   └── vehicle-state.ts     # 车辆状态管理
│   ├── llm/                     # LLM 层
│   │   ├── orchestrator.ts      # (旧) LLM 编排
│   │   ├── function-registry.ts # (旧) 工具注册表
│   │   ├── providers/
│   │   │   ├── gemini.ts        # Google Gemini
│   │   │   └── zhipu.ts         # 智谱 GLM
│   │   └── functions/           # (旧) Function 定义
│   ├── web/                     # Web 服务
│   │   ├── server.ts            # Fastify 服务器
│   │   └── routes/
│   │       ├── api.ts           # REST API
│   │       └── ws.ts            # WebSocket
│   └── cli/                     # CLI 层
│       ├── repl.ts              # REPL 交互
│       └── renderer.ts          # 输出渲染
├── web/                         # Vue 前端
│   ├── src/
│   │   ├── components/          # Vue 组件
│   │   ├── stores/              # Pinia 状态
│   │   ├── hooks/               # Vue Hooks
│   │   └── services/            # API 服务
│   ├── tests/e2e/               # Playwright 测试
│   └── package.json
├── prompts/
│   └── system.md                # 系统提示词模板
├── test/
│   ├── smoke-test.ts            # 冒烟测试
│   └── e2e-test.ts              # 端到端测试
├── codemaps/                    # 架构文档
│   ├── architecture.md          # 总览
│   ├── backend.md               # 后端架构
│   ├── frontend.md              # 前端架构
│   └── data.md                  # 数据流
└── docs/
    ├── system-design.md         # 系统设计
    ├── CONTRIB.md               # 本文件
    └── RUNBOOK.md               # 运维手册
```

## 开发流程

### 添加新的领域处理器

1. 在 `src/domains/` 下创建新目录
2. 实现 `handler.ts` - 继承 `BaseDomainHandler`
3. 实现 `model.ts` - 继承 `BaseDomainModel`
4. 创建 `prompts/xxx.md` 提示词
5. 在 `src/controller/domain-router.ts` 中注册
6. 编写单元测试

### 添加新的 LLM Provider

1. 在 `src/llm/providers/` 下创建新文件
2. 实现 `LLMProvider` 接口
3. 在 `src/cli/repl.ts` 的 `createProvider()` 中注册
4. 在 `.env.example` 中添加 API Key 变量

### 修改系统提示词

编辑 `prompts/system.md`，支持占位符：
- `{{vehicle_state}}` - 注入当前车辆状态

## 测试

### 测试覆盖场景

| 场景 | 用例数 |
|------|--------|
| 基础车控指令（空调/车窗/后备箱） | 4 |
| 音乐与导航 | 3 |
| 闲聊与知识查询 | 3 |
| 多轮对话记忆（上下文承接） | 3 |
| 领域无缝切换 | 4 |
| **合计** | **17** |

### 运行测试

```bash
# 单元测试
npm test

# 覆盖率报告
npm run test:coverage

# 冒烟测试（需要 API Key）
npm run test:smoke

# E2E 测试（需要 API Key）
npm run test:e2e

# 前端 E2E 测试
cd web && npm run test:e2e
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

### 大模型中枢控制器架构

```
用户输入
    ↓
CentralController (大模型落域 + 多意图拆分 + Query改写)
    ↓
DomainRouter (路由分发)
    ↓
DomainHandler + DomainModel (小模型意图提取)
    ↓
CommandExecutor (执行)
    ↓
VehicleStateManager (状态更新)
```

## 相关文档

- [架构总览](/Users/zhangdawei/david/github/nlc/codemaps/architecture.md)
- [运维手册](/Users/zhangdawei/david/github/nlc/docs/RUNBOOK.md)
- [系统设计](/Users/zhangdawei/david/github/nlc/docs/system-design.md)
