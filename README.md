# NLC Demo - 智能座舱自然语言控制系统

> 极简 DEMO - 智能座舱自然语言控制系统，采用 **文件系统级 Skills V2 架构**

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
- 天气查询
- 多轮对话记忆

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript 5.7 |
| 运行时 | Node.js >= 18 (ESM) |
| LLM | Gemini 3 Flash / GLM-4-Plus / MiniMax-M2.5 |
| 测试 | Vitest |

## 快速开始

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
# Google Gemini API Key (必填)
GEMINI_API_KEY=your_api_key_here

# 智谱 GLM API Key (可选)
ZHIPU_API_KEY=

# MiniMax API Key (可选)
MINIMAX_API_KEY=
MINIMAX_MODEL=MiniMax-M2.5

# 默认模型: gemini, glm, minimax
DEFAULT_MODEL=gemini
```

### 4. 启动程序

```bash
npm start
```

## 使用示例

启动后进入交互式 REPL：

```
═══════════════════════════════════════════
  NLC Demo v0.1 - 智能座舱语言控制系统
  模型: gemini-3-flash-preview | 输入 /help 查看帮助
═══════════════════════════════════════════

你> 把空调调到24度

───────── 识别结果 ─────────
  Skill: vehicle_control
  Capability: ac_control
  Slots: {"action":"set_temperature","temperature":24}
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
"上海天气如何"
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
| `/skill` | 测试 Skill 系统 |
| `/quit` | 退出 |

## 项目结构

```
nlc/
├── skills/                      # Skills 配置 (V2 文件系统级)
│   ├── vehicle_control/
│   │   ├── skill.yaml
│   │   └── SKILL.md
│   ├── music/
│   ├── navigation/
│   └── chat/
│       └── scripts/             # 外部脚本支持
│           └── scripts.yaml
├── src/
│   ├── cli/                     # 命令行界面
│   │   ├── skill-repl.ts       # REPL 入口
│   │   └── renderer.ts         # 输出渲染
│   ├── skills/
│   │   └── v2/                  # Skill V2 系统
│   │       ├── file-based-orchestrator.ts
│   │       ├── file-based-skill-registry.ts
│   │       ├── skill-executor.ts
│   │       ├── skill-loader.ts
│   │       ├── yaml-parser.ts
│   │       └── script-executor.ts
│   ├── dialog/                  # 对话管理
│   │   └── new-dialog-manager.ts
│   ├── controller/              # 控制器层
│   │   └── central-controller.ts
│   ├── executor/                # 指令执行
│   │   ├── command-executor.ts
│   │   └── vehicle-state.ts
│   ├── llm/                     # LLM 层
│   │   └── providers/
│   │       ├── gemini.ts
│   │       ├── zhipu.ts
│   │       └── minimax.ts
│   ├── types/                   # 类型定义
│   └── config.ts                # 配置
├── test/
│   └── smoke-test.ts            # 冒烟测试
├── codemaps/                    # 架构文档
└── docs/                        # 开发文档
```

## 三层加载策略

Skills V2 采用渐进式披露设计：

| 层级 | 文件 | 加载时机 | 用途 |
|------|------|----------|------|
| 第一层 | `skill.yaml` | 启动时 | 元数据和能力定义 |
| 第二层 | `SKILL.md` | 意图识别后 | LLM 详细指令 |
| 第三层 | 能力处理器 | 执行时 | 实际执行逻辑 |

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
```

## API Key 获取

- **Google Gemini**: https://aistudio.google.com/apikey
- **智谱 GLM**: https://open.bigmodel.cn/
- **MiniMax**: https://platform.minimaxi.com/

## 许可证

MIT License

## 相关文档

- [开发指南](docs/CONTRIB.md)
- [运维手册](docs/RUNBOOK.md)
- [架构总览](codemaps/architecture.md)
