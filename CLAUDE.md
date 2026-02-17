# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
# 开发
npm start              # CLI REPL 模式
npm run dev            # CLI 开发模式（热重载）
npm run skill          # Skill REPL 模式（V2 文件系统级 Skills）
npm run skill:demo     # Skill 系统演示
npm run rewrite        # 一语多意图改写工具

# 测试
npm test               # 运行单元测试
npm run test:watch     # 监听模式
npm run test:coverage  # 覆盖率报告（阈值 80%）
npm run test:smoke     # 冒烟测试（需要 API Key）
```

## 核心架构

这是一个智能座舱自然语言控制系统 Demo，使用 **文件系统级 Skills V2 架构** 将自然语言映射为结构化车辆控制指令。

### 数据流

```
用户输入 → NewDialogManager → FileBasedSkillOrchestrator
                                      ↓
                              LLM 意图识别
                                      ↓
                              SkillExecutor
                                      ↓
                              能力处理器执行
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
| NewDialogManager | 统一管理用户输入处理流程，维护对话历史（最多60条） | `src/dialog/new-dialog-manager.ts` |
| CentralControllerImpl | 大模型落域识别、多意图拆分、Query改写 | `src/controller/central-controller.ts` |
| CommandExecutor | 执行指令（纯函数式设计） | `src/executor/command-executor.ts` |
| VehicleStateManager | 管理车辆状态（不可变状态设计） | `src/executor/vehicle-state.ts` |

### Skill V2 系统（文件系统级）

基于 YAML 配置的 Skills，支持渐进式披露（三层加载）：

| 模块 | 职责 | 文件位置 |
|------|------|----------|
| FileBasedSkillOrchestrator | Skill 编排器，LLM 意图识别和执行 | `src/skills/v2/file-based-orchestrator.ts` |
| FileBasedSkillRegistry | Skill 注册和元数据管理 | `src/skills/v2/file-based-skill-registry.ts` |
| SkillExecutor | 能力执行器，处理器注册 | `src/skills/v2/skill-executor.ts` |
| SkillLoader | 从文件系统加载 Skills | `src/skills/v2/skill-loader.ts` |
| yaml-parser | 解析 skill.yaml 配置 | `src/skills/v2/yaml-parser.ts` |

### Skills 目录结构

```
skills/
├── vehicle_control/
│   ├── skill.yaml       # 元数据和能力定义
│   ├── SKILL.md         # LLM 指令（延迟加载）
│   └── examples/        # 示例文件
├── music/
│   ├── skill.yaml
│   ├── SKILL.md
│   └── examples/
├── navigation/
│   ├── skill.yaml
│   ├── SKILL.md
│   └── examples/
└── chat/
    ├── skill.yaml
    ├── SKILL.md
    └── examples/
```

### 三层加载策略

| 层级 | 文件 | 加载时机 | 用途 |
|------|------|----------|------|
| 第一层 | skill.yaml | 启动时 | 元数据和能力定义（~50 tokens/skill） |
| 第二层 | SKILL.md | 意图识别后 | LLM 指令（~500 tokens/skill） |
| 第三层 | 能力处理器 | 执行时 | 实际执行逻辑 |

### 领域分类

- `vehicle_control`: 车辆控制（空调、车窗、座椅、灯光、后备箱、雨刮器）
- `music`: 音乐控制（播放、暂停、切歌、搜索、音量、模式）
- `navigation`: 导航控制（目的地、路线偏好、取消）
- `chat`: 智能问答（闲聊、车辆问答、天气查询）

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

### 新增 Skill（V2 文件系统级）

1. 在 `skills/` 目录下创建新文件夹（如 `skills/my_skill/`）
2. 创建 `skill.yaml` 文件，定义元数据和能力：
   ```yaml
   id: my_skill
   name: 我的技能
   description: 技能描述
   domain: my_domain
   version: "1.0.0"
   priority: 100
   enabled: true
   tags:
     - tag1
     - tag2

   capabilities:
     - name: my_capability
       description: 能力描述
       examples:
         - 示例1
         - 示例2
       slots:
         - name: param1
           type: string
           required: true
           description: 参数描述
       keywords:
         - 关键词1
         - 关键词2
   ```
3. 创建 `SKILL.md` 文件，提供 LLM 指令（详细的能力说明和参数示例）
4. 创建 `examples/` 目录存放示例文件
5. 在 `SkillExecutor` 中注册能力处理器
6. 编写单元测试

### 环境变量

必需配置在 `.env` 文件中：

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `GEMINI_API_KEY` | 是 | Google Gemini API Key | - |
| `ZHIPU_API_KEY` | 否 | 智谱 GLM API Key | - |
| `CLAUDE_API_KEY` | 否 | Claude API Key（未实现） | - |
| `DEFAULT_MODEL` | 否 | 默认模型选择 | `gemini` |

## 运行模式

- **CLI 模式** (`npm start`): REPL 交互式命令行，适合快速测试和开发
- **Skill REPL** (`npm run skill`): V2 Skill 系统独立测试

## 相关文档

- [开发指南](docs/CONTRIB.md)
- [运维手册](docs/RUNBOOK.md)
- [架构总览](codemaps/architecture.md)
