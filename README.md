# NLC Demo - 智能座舱自然语言控制系统

面向新能源汽车智能座舱的自然语言控制与交互平台 Demo。用户通过语音或文本输入自然语言指令，系统利用大语言模型（LLM）进行意图理解和实体提取，将自然语言映射为结构化的车辆控制指令。

## 功能特性

### 车辆控制
- **空调控制**: 温度调节、模式切换、风速设置
- **车窗控制**: 开关、开度调节
- **座椅控制**: 加热、通风
- **灯光控制**: 氛围灯、阅读灯
- **后备箱**: 开关控制
- **雨刮器**: 开关、速度调节

### 音乐控制
- 播放/暂停/切歌
- 搜索播放
- 音量调节
- 播放模式切换

### 导航控制
- 目的地设置
- 路线偏好
- 取消导航

### 智能对话
- 自由聊天
- 车辆状态查询
- 多轮对话记忆

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript |
| 运行时 | Node.js (ESM) |
| LLM | Google Gemini / 智谱 GLM |
| 后端 | Fastify (HTTP + WebSocket) |
| 前端 | Vue 3 + Vite + Tailwind CSS |
| 状态管理 | Pinia |
| 测试 | Vitest (99.47% 覆盖率) |
| 架构 | Function Calling |

## 快速开始

### CLI 模式

### 1. 克隆项目

```bash
git clone https://github.com/home45006/nlc.git
cd nlc
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
# Google Gemini API Key
GEMINI_API_KEY=your_api_key_here

# 智谱 GLM API Key (可选)
ZHIPU_API_KEY=

# 默认模型: gemini, glm
DEFAULT_MODEL=gemini
```

### 4. 启动程序

#### CLI 模式

```bash
npm start
```

#### Web 模式

```bash
# 安装前端依赖
cd web && npm install && cd ..

# 启动后端服务
npm run web

# 在另一个终端启动前端开发服务器
cd web && npm run dev
```

访问 http://localhost:5173 使用 Web 界面。

**生产环境部署:**

```bash
# 构建前端
cd web && npm run build && cd ..

# 启动服务 (自动服务静态文件)
npm run web
```

访问 http://localhost:3000

## 使用示例

启动后进入交互式 REPL：

```
═══════════════════════════════════════════
  NLC Demo v0.1 - 智能座舱语言控制系统
  模型: gemini-3-flash-preview | 输入 /help 查看帮助
═══════════════════════════════════════════

你> 把空调调到24度

───────── 识别结果 ─────────
  Domain: vehicle_control
  Intent: ac_control_set_temperature
  Slots:  {"action":"set_temperature","temperature":24}
────────────────────────────

小智> 好的，已为您将空调温度调至24度。

  [变更] 空调温度: 26°C → 24°C

  ⏱ 1.2s | gemini-3-flash-preview | 512+48 tokens
```

### 支持的指令示例

```
# 车辆控制
"打开空调"
"空调调到24度"
"打开主驾车窗"
"关闭所有车窗"
"座椅加热开到3挡"
"打开氛围灯"
"氛围灯调成蓝色"
"打开后备箱"
"打开雨刮器"

# 音乐控制
"播放音乐"
"暂停"
"下一首"
"播放周杰伦的晴天"
"音量调到50"
"单曲循环"

# 导航控制
"导航到天安门"
"走高速"
"取消导航"

# 闲聊
"还剩多少电"
"你叫什么名字"
"今天天气怎么样"
```

### REPL 命令

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助 |
| `/state` | 查看车辆状态 |
| `/model` | 切换模型 |
| `/history` | 查看对话历史 |
| `/clear` | 清除对话历史 |
| `/reset` | 重置车辆状态 |
| `/debug` | 开关调试模式 |
| `/quit` | 退出 |

## 项目结构

```
nlc/
├── src/
│   ├── cli/                    # 命令行界面
│   │   ├── repl.ts             # REPL 交互
│   │   └── renderer.ts         # 输出渲染
│   ├── web/                    # Web 服务 (新增)
│   │   ├── server.ts           # HTTP + WebSocket 服务器
│   │   └── routes/
│   │       ├── api.ts          # REST API 路由
│   │       └── ws.ts           # WebSocket 处理
│   ├── dialog/                 # 对话管理
│   │   └── dialog-manager.ts   # 对话管理器
│   ├── executor/               # 指令执行
│   │   ├── command-executor.ts # 命令执行器
│   │   └── vehicle-state.ts    # 车辆状态管理
│   ├── llm/                    # LLM 相关
│   │   ├── providers/          # LLM 提供者
│   │   │   ├── gemini.ts       # Google Gemini
│   │   │   └── zhipu.ts        # 智谱 GLM
│   │   ├── functions/          # Function 定义
│   │   ├── orchestrator.ts     # LLM 编排器
│   │   ├── function-registry.ts# 函数注册表
│   │   └── prompt-builder.ts   # Prompt 构建
│   ├── types/                  # 类型定义
│   ├── __tests__/              # 单元测试
│   ├── config.ts               # 配置
│   ├── constants.ts            # 常量
│   └── main.ts                 # 入口
├── web/                        # 前端项目 (新增)
│   ├── src/
│   │   ├── components/         # Vue 组件
│   │   │   ├── layout/         # 布局组件
│   │   │   ├── chat/           # 对话组件
│   │   │   └── vehicle/        # 车辆状态组件
│   │   ├── stores/             # Pinia 状态管理
│   │   ├── hooks/              # Vue Hooks
│   │   ├── services/           # API 服务
│   │   └── types/              # 类型定义
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.js
├── prompts/
│   └── system.md               # 系统提示词
├── test/
│   ├── smoke-test.ts           # 冒烟测试
│   └── e2e-test.ts             # 端到端测试
└── docs/                       # 文档
```

## 测试

```bash
# 运行单元测试
npm test

# Watch 模式
npm run test:watch

# 测试覆盖率
npm run test:coverage

# 冒烟测试 (需要 API Key)
npm run test:smoke

# E2E 测试 (需要 API Key)
npm run test:e2e
```

### 测试覆盖率

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   99.47 |    86.09 |   91.66 |   99.47 |
-------------------|---------|----------|---------|---------|
```

## 架构设计

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

## API Key 获取

- **Google Gemini**: https://aistudio.google.com/apikey
- **智谱 GLM**: https://open.bigmodel.cn/

## 许可证

MIT License

## 相关文档

- [系统设计文档](docs/system-design.md)
- [测试覆盖率报告](docs/test-coverage-report.md)
- [运维手册](docs/RUNBOOK.md)
- [贡献指南](docs/CONTRIB.md)
