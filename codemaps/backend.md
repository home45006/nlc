# 后端模块

> 更新时间: 2026-02-13

## 模块划分

### 1. CLI 层 (`src/cli/`)

```
repl.ts          REPL 循环 + 斜杠命令路由
 ├ startRepl()   入口函数, 创建 readline 接口
 ├ handleCommand()  处理 /help /state /model /history /clear /reset /debug /quit
 └ createProvider() 工厂函数: model名 → LLMProvider 实例

renderer.ts      终端输出格式化
 ├ renderBanner()        启动横幅
 ├ renderResult()        识别结果 + TTS + 状态变更 + tokens
 ├ renderVehicleState()  车辆状态全览
 ├ renderHelp()          帮助信息
 ├ renderHistory()       对话历史
 └ renderError()         错误信息
```

### 2. 对话管理层 (`src/dialog/`)

```
dialog-manager.ts    核心业务编排
 ├ handleInput()     用户输入 → DialogResult (主入口)
 ├ generateTtsFromChanges()  工具调用 → 中文 TTS 文本
 ├ describeAction()  函数名+参数 → 自然语言描述 (8大函数全覆盖)
 ├ switchProvider()   运行时切换 LLM
 ├ getHistory()      获取对话历史
 ├ clearHistory()    清除历史
 ├ resetState()      重置状态+历史
 └ trimHistory()     截断历史至 60 条
```

**历史记录格式 (关键)**:
```
工具调用场景: user → assistant(functionCall) → tool(result) → assistant(text)
普通对话场景: user → assistant(text)
```

### 3. LLM 编排层 (`src/llm/`)

```
orchestrator.ts       LLM 调用编排
 ├ process()          构建请求 → 调用 LLM → 解析响应 → OrchestratorResult
 └ getToolResponseText()  二次请求获取文本 (预留)

prompt-builder.ts     消息构建
 ├ buildMessages()    system(含车辆状态) + history + user → ChatMessage[]
 └ formatVehicleState()  VehicleState → 可读文本

function-registry.ts  工具注册与路由
 ├ getAllTools()       返回 8 个 ToolDefinition
 └ resolve()          函数名+参数 → { domain, intent }
```

### 4. Provider 层 (`src/llm/providers/`)

```
gemini.ts (主力)
 ├ GeminiProvider.chat()   调用 Gemini API
 ├ convertMessages()       ChatMessage[] → Gemini 格式
 ├ convertTools()          ToolDefinition[] → Gemini 格式
 ├ mergeConsecutiveRoles() 合并连续同角色消息
 └ findFunctionNameForToolCallId()  工具ID反查函数名

zhipu.ts (备选)
 └ ZhipuProvider.chat()    调用智谱 GLM API
```

**Gemini 配置要点**:
- 模型: `gemini-3-flash-preview`
- Thinking: 关闭 (`thinkingBudget: 0`)
- Tool: AUTO 模式
- 温度: 0.3

### 5. 工具定义层 (`src/llm/functions/`)

```
vehicle.ts      6 个车控工具: control_ac/window/seat/light/trunk/wiper
music.ts        1 个音乐工具: control_music
navigation.ts   1 个导航工具: control_navigation
```

每个工具定义包含: name, description (中文), parameters (JSON Schema)

### 6. 执行层 (`src/executor/`)

```
command-executor.ts   ToolCall[] → StateChange[]
 └ execute()          遍历工具调用, 委托给 VehicleStateManager

vehicle-state.ts      内存车辆状态
 ├ getState()         获取当前状态快照
 ├ reset()            恢复默认值
 └ applyCommand()     分发到 8 个 handle* 方法
     ├ handleAc()         空调: 开关/温度/模式/风速
     ├ handleWindow()     车窗: 开关/开度/全部
     ├ handleSeat()       座椅: 加热/通风/等级
     ├ handleLight()      灯光: 氛围灯/阅读灯/颜色
     ├ handleTrunk()      后备箱: 开关
     ├ handleWiper()      雨刮: 开关/速度
     ├ handleMusic()      音乐: 播放/暂停/搜索/音量/模式
     └ handleNavigation() 导航: 目的地/路线/取消
```

**不可变更新模式**: `this.state = { ...this.state, field: newValue }`

## 外部依赖

| 依赖 | 用途 | 调用位置 |
|------|------|----------|
| `dotenv` | 加载 .env | `config.ts` |
| `zod` | 类型校验 | (已引入, 暂未使用) |
| `node:readline` | CLI 输入 | `repl.ts` |
| `node:fs` | 读取 prompt 文件 | `prompt-builder.ts` |
| `node:path` / `node:url` | 路径处理 | `prompt-builder.ts` |
| Gemini REST API | LLM 推理 | `gemini.ts` |
| Zhipu REST API | LLM 推理 | `zhipu.ts` |
