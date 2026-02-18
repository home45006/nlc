# 架构总览

> 更新时间: 2026-02-18 | 源文件: 43 | 测试文件: 23

## 系统定位

新能源智能座舱自然语言控制系统 Demo，采用 **文件系统级 Skills V2 架构**，将自然语言映射为结构化车辆控制指令。

**核心设计理念**：
- 大模型作为中枢控制器，负责意图识别和 Query 改写
- 文件系统级 Skills，支持 YAML 配置和渐进式披露
- 三层加载策略优化 Token 消耗

## 分层架构

```
+---------------------------------------------------------+
|  CLI 层 (src/cli/)                                       |
|  REPL 交互式命令行 + 终端渲染                             |
+---------------------------------------------------------+
|  对话管理层 (src/dialog/)                                 |
|  NewDialogManager - 协调编排器和状态管理                   |
+---------------------------------------------------------+
|  Skill V2 系统 (src/skills/v2/)                          |
|  FileBasedSkillOrchestrator - LLM 意图识别和执行          |
|  FileBasedSkillRegistry - Skill 注册和元数据管理          |
|  SkillExecutor - 能力执行器                               |
|  SkillLoader - 文件系统加载                               |
|  ScriptExecutor - 外部脚本执行器                          |
|  SandboxManager - 沙箱管理器                              |
|  ScriptCapabilityHandler - 脚本能力处理器                 |
+---------------------------------------------------------+
|  控制器层 (src/controller/)                              |
|  CentralController (大模型落域+改写)                      |
+---------------------------------------------------------+
|  执行层 (src/executor/)                                  |
|  CommandExecutor + VehicleStateManager                   |
+---------------------------------------------------------+
|  LLM 层 (src/llm/)                                       |
|  providers/gemini.ts + zhipu.ts + minimax.ts            |
+---------------------------------------------------------+
|  类型层 (src/types/)                                     |
|  domain . vehicle . llm . dialog                        |
+---------------------------------------------------------+
```

## 数据流

```
用户输入
    |
    v
NewDialogManager.handleInput()
    |
    +------------------------------------------+
    |                                          |
    v                                          v
FileBasedSkillOrchestrator              VehicleStateManager.getState()
    |
    +-> 第一层：加载所有 skill.yaml 元数据
    |   (启动时完成，~200 tokens for 4 skills)
    |
    +-> LLM 意图识别
    |   (使用元数据构建 Prompt，识别目标 Skill)
    |
    +-> 第二层：按需加载 SKILL.md 指令
    |   (只加载匹配的 Skill，~500 tokens per skill)
    |
    +-> SkillExecutor.execute()
    |   |
    |   +-> 第三层：调用能力处理器
    |       (预注册的处理器函数)
    |
    v
CommandExecutor.execute()
    |
    v
VehicleStateManager.applyCommand()
    |
    v
StateChange[] + TTS 文本
    |
    v
返回 DialogResult
```

## Skill V2 系统架构

```
+---------------------------------------------------------+
|  skills/ 目录（文件系统级配置）                           |
|  +-- vehicle_control/                                    |
|  |   +-- skill.yaml       (第一层：元数据)               |
|  |   +-- SKILL.md         (第二层：指令)                 |
|  |   +-- examples/                                        |
|  +-- music/                                              |
|  +-- navigation/                                         |
|  +-- chat/                                               |
+---------------------------------------------------------+
                           |
                           v
+---------------------------------------------------------+
|  SkillLoader                                             |
|  - loadAllSkills()  扫描 skills/ 目录                    |
|  - loadInstructions()  按需加载 SKILL.md                 |
+---------------------------------------------------------+
                           |
                           v
+---------------------------------------------------------+
|  FileBasedSkillRegistry                                  |
|  - scanSkillsDirectory()  扫描并注册所有 Skill           |
|  - getCapabilityDescriptions()  生成能力描述             |
|  - loadInstructions()  延迟加载指令                      |
+---------------------------------------------------------+
                           |
                           v
+---------------------------------------------------------+
|  FileBasedSkillOrchestrator                              |
|  - process()  编排意图识别和执行                         |
|  - recognizeIntents()  LLM 意图识别                      |
|  - executeIntents()  执行意图列表                        |
+---------------------------------------------------------+
                           |
                           v
+---------------------------------------------------------+
|  SkillExecutor                                           |
|  - registerCapabilityHandler()  注册能力处理器           |
|  - executeCapability()  执行能力                        |
|                                                          |
|  内置处理器：                                             |
|  +-- vehicle_control (ac, window, seat, light, trunk,   |
|  |                     wiper)                            |
|  +-- music (play, pause, volume, mode)                  |
|  +-- navigation (destination, route, cancel)            |
|  +-- chat (free_chat, vehicle_qa, weather_query)        |
+---------------------------------------------------------+
```

## 脚本执行子系统架构

```
+---------------------------------------------------------+
|  scripts.yaml 配置文件                                   |
|  +-- settings (默认超时、解释器、网络权限)                |
|  +-- scripts[] (脚本列表)                                |
|      +-- id, name, path, interpreter                    |
|      +-- timeout, env, capabilities                     |
+---------------------------------------------------------+
                           |
                           v
+---------------------------------------------------------+
|  ScriptConfigLoader                                      |
|  - load()  加载配置并验证                                |
|  - validatePath()  路径安全检查                          |
|  - findByCapability()  按能力查找脚本                   |
+---------------------------------------------------------+
                           |
                           v
+---------------------------------------------------------+
|  ScriptCapabilityHandler                                 |
|  - handle()  处理脚本能力调用                            |
|  - validateInput()  输入验证                            |
|  - buildArgs()  构建脚本参数                            |
|  - processResult()  处理执行结果                        |
+---------------------------------------------------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
+---------------------+       +---------------------+
|  ScriptExecutor     |       |  SandboxManager     |
|  - execute()        |       |  (可选沙箱隔离)     |
|  - spawn 子进程     |       |  - 路径白名单       |
|  - 超时控制         |       |  - 环境隔离         |
|  - 输出收集         |       |  - 资源限制         |
+---------------------+       +---------------------+
            |                             |
            +--------------+--------------+
                           |
                           v
+---------------------------------------------------------+
|  InputValidator              ResultFormatter            |
|  - isSafeString()  安全检查   - format()  格式化输出   |
|  - sanitizeString()  清理     - generateTtsText()      |
|  - validate()  验证规则       - applyTemplate()        |
+---------------------------------------------------------+
```

### 支持的解释器

| 解释器 | 路径 | 用途 |
|--------|------|------|
| bash | /bin/bash | Shell 脚本 |
| sh | /bin/sh | POSIX Shell |
| node | process.execPath | JavaScript |
| python3 | python3 | Python 脚本 |
| auto | (自动检测) | 根据扩展名判断 |

### 安全措施

| 层面 | 措施 |
|------|------|
| 路径安全 | 禁止 ..、绝对路径、命令替换 |
| 输入验证 | 危险字符过滤、长度限制 |
| 执行隔离 | spawn 而非 exec、超时控制 |
| 沙箱模式 | 路径白名单、环境隔离、资源限制 |

## 三层加载策略

| 层级 | 文件 | 加载时机 | Token 消耗 | 用途 |
|------|------|----------|------------|------|
| 第一层 | `skill.yaml` | 启动时 | ~50 tokens/skill | 元数据和能力定义 |
| 第二层 | `SKILL.md` | 意图识别后 | ~500 tokens/skill | LLM 详细指令 |
| 第三层 | 能力处理器 | 执行时 | - | 实际执行逻辑 |

**优势**：
- 启动快速：只加载轻量元数据
- Token 优化：只加载需要的指令
- 可扩展：新增 Skill 只需添加文件

## 核心模块清单

| 模块 | 职责 | 文件位置 |
|------|------|----------|
| **Skill V2 系统** | | |
| types | V2 类型定义 | src/skills/v2/types.ts |
| yaml-parser | YAML 解析器 | src/skills/v2/yaml-parser.ts |
| skill-loader | 文件系统加载 | src/skills/v2/skill-loader.ts |
| file-based-skill-registry | Skill 注册表 | src/skills/v2/file-based-skill-registry.ts |
| skill-executor | 能力执行器 | src/skills/v2/skill-executor.ts |
| file-based-orchestrator | 编排器 | src/skills/v2/file-based-orchestrator.ts |
| **脚本执行子系统** | | |
| script-executor | 外部脚本执行器 | src/skills/v2/script-executor.ts |
| script-config-loader | 脚本配置加载器 | src/skills/v2/script-config-loader.ts |
| sandbox-manager | 沙箱管理器 | src/skills/v2/sandbox-manager.ts |
| script-capability-handler | 脚本能力处理器 | src/skills/v2/script-capability-handler.ts |
| input-validator | 输入验证器 | src/skills/v2/input-validator.ts |
| result-formatter | 结果格式化器 | src/skills/v2/result-formatter.ts |
| **通用 Skill 类型** | | |
| types | Skill 类型定义 | src/skills/types.ts |
| index | Skill 模块入口 | src/skills/index.ts |
| **控制器** | | |
| central-controller | 大模型落域+改写 | src/controller/central-controller.ts |
| **对话管理** | | |
| new-dialog-manager | 对话管理器 | src/dialog/new-dialog-manager.ts |
| dialog-manager | (旧) 传统对话管理器 | src/dialog/dialog-manager.ts |
| **执行层** | | |
| command-executor | 指令执行器 | src/executor/command-executor.ts |
| vehicle-state | 车辆状态管理 | src/executor/vehicle-state.ts |
| **LLM 层** | | |
| providers/gemini | Gemini API 适配 | src/llm/providers/gemini.ts |
| providers/zhipu | GLM API 适配 | src/llm/providers/zhipu.ts |
| providers/minimax | MiniMax API 适配 | src/llm/providers/minimax.ts |
| orchestrator | LLM 编排 | src/llm/orchestrator.ts |
| function-registry | 工具注册表 | src/llm/function-registry.ts |
| prompt-builder | Prompt 构建 | src/llm/prompt-builder.ts |
| intent-rewriter | 意图改写 | src/llm/intent-rewriter.ts |
| **CLI** | | |
| skill-repl | REPL 交互入口 | src/cli/skill-repl.ts |
| renderer | 终端输出 | src/cli/renderer.ts |
| rewrite-cli | Query 改写工具 | src/cli/rewrite-cli.ts |

## Skills 配置清单

| Skill ID | 名称 | 优先级 | 能力数量 | 目录 |
|----------|------|--------|----------|------|
| vehicle_control | 车辆控制 | 1 | 6 | skills/vehicle_control/ |
| music | 音乐控制 | 5 | 7 | skills/music/ |
| navigation | 导航控制 | 8 | 3 | skills/navigation/ |
| chat | 智能问答 | 10 | 3 | skills/chat/ |

### 能力详情

**vehicle_control** (6 能力):
- ac_control - 空调控制
- window_control - 车窗控制
- seat_control - 座椅控制
- light_control - 灯光控制
- trunk_control - 后备箱控制
- wiper_control - 雨刮器控制

**music** (7 能力):
- play, pause, next, previous
- search, volume, mode

**navigation** (3 能力):
- set_destination - 设置目的地
- set_route_preference - 路线偏好
- cancel - 取消导航

**chat** (3 能力):
- free_chat - 自由聊天
- vehicle_qa - 车辆问答
- weather_query - 天气查询

## 技术栈

### 后端
- **运行时**: Node.js >= 18, tsx
- **语言**: TypeScript 5.7 (strict, ESM)
- **LLM**: Gemini 3 Flash (主力), GLM-4-Plus / MiniMax-M2.5 (备选)
- **依赖**: dotenv

### 基础设施
- **存储**: 纯内存 (无数据库)
- **配置**: YAML + Markdown 文件

## 领域划分

| 领域 | 类型标识 | Skill 目录 |
|------|----------|------------|
| 车辆控制 | `vehicle_control` | skills/vehicle_control/ |
| 音乐控制 | `music` | skills/music/ |
| 导航控制 | `navigation` | skills/navigation/ |
| 智能问答 | `chat` | skills/chat/ |

## 运行模式

- **CLI 模式** (`npm start`): REPL 交互式命令行
- **Skill REPL**: 在 REPL 中使用 `/skill` 命令测试 V2 Skill 系统

## 测试覆盖

| 测试类型 | 文件位置 | 数量 |
|----------|----------|------|
| 单元测试 | src/__tests__/ | 22 |
| 冒烟测试 | test/smoke-test.ts | 1 |

### 测试模块分布

| 模块 | 测试文件 |
|------|----------|
| Skills V2 | yaml-parser, types, skill-loader, file-based-orchestrator, skill-executor, file-based-skill-registry, script-executor, input-validator, script-integration |
| Skills 通用 | index, types, file-based-skills, integration |
| LLM | orchestrator, function-registry, prompt-builder |
| Controller | central-controller |
| Dialog | dialog-manager |
| Executor | command-executor, vehicle-state |
| Config | config, constants |
| CLI | renderer |

## 关键设计模式

1. **策略模式**: 能力处理器接口允许多种实现
2. **工厂模式**: SkillLoader 从文件系统创建 Skill
3. **渐进式披露**: 三层加载策略优化 Token 消耗
4. **不可变状态**: VehicleStateManager 返回新状态对象
5. **依赖注入**: LLMProvider 通过构造函数注入
6. **注册表模式**: FileBasedSkillRegistry 管理 Skill 元数据

## 架构变更记录

### 2026-02-18
- 新增 MiniMax M2.5 LLM Provider (`src/llm/providers/minimax.ts`)
- 移除旧的 `src/cli/repl.ts`，重构为单一入口
- 更新 DEFAULT_MODEL 支持 `minimax` 选项
- Skill REPL 改为在主 REPL 中使用 `/skill` 命令

### 2026-02-17 (下午)
- 新增脚本执行子系统
- 新增 `src/skills/v2/script-executor.ts` - 外部脚本执行器
- 新增 `src/skills/v2/script-config-loader.ts` - 脚本配置加载器
- 新增 `src/skills/v2/sandbox-manager.ts` - 沙箱管理器
- 新增 `src/skills/v2/script-capability-handler.ts` - 脚本能力处理器
- 新增 `src/skills/v2/input-validator.ts` - 输入验证器
- 新增 `src/skills/v2/result-formatter.ts` - 结果格式化器
- 新增 `skills/chat/scripts/scripts.yaml` - Chat Skill 脚本配置
- 支持 bash、node、python3 解释器
- 实现沙箱隔离和输入验证安全措施

### 2026-02-17 (上午)
- 实现文件系统级 Skills V2 架构
- 新增 `skills/` 目录存放 Skill 配置
- 新增 `src/skills/v2/` 模块
- 支持三层渐进式披露加载策略
- 删除旧的代码级 Skill 实现
- 删除 Web 模式和前端

### 2026-02-16
- 删除 Web 模式和前端（`web/` 目录）
- 删除 `src/web/` 服务端代码
- 新增 Skill 系统（`src/skills/`）
- 清理未使用代码

### 2026-02-15
- 实现大模型中枢控制器架构
- 重构为多阶段处理流程
