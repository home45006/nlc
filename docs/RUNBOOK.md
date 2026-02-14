# 运维手册

## 启动

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 GEMINI_API_KEY

# 启动
npm start
```

启动后显示 REPL 界面，输入自然语言与"小智"交互。

## REPL 命令

| 命令 | 功能 |
|------|------|
| `/help` | 显示帮助 |
| `/state` | 查看当前车辆状态 |
| `/model gemini` | 切换到 Gemini |
| `/model glm` | 切换到 GLM |
| `/history` | 查看对话历史 |
| `/clear` | 清除对话历史 |
| `/reset` | 重置车辆状态和对话历史 |
| `/debug` | 开关调试模式 |
| `/quit` | 退出 |

## 当前模型配置

- **默认模型**: Gemini 3 Flash Preview（`gemini-3-flash-preview`）
- **API 端点**: `https://generativelanguage.googleapis.com/v1beta/models/`
- **温度**: 0.3
- **最大输出 Token**: 1024
- **Thinking 模式**: 关闭（`thinkingBudget: 0`）
- **Tool 配置**: AUTO 模式

## 常见问题排查

### 1. 启动报错 "未配置 GEMINI_API_KEY"

**原因**: `.env` 文件不存在或未设置 `GEMINI_API_KEY`

**解决**:
```bash
cp .env.example .env
# 编辑 .env，填入有效的 Gemini API Key
```

### 2. Gemini API 返回 404

**原因**: 模型名称不正确或区域不支持

**解决**: 检查 `src/llm/providers/gemini.ts` 中的 `GEMINI_MODEL` 常量，确认模型名称有效。可通过以下命令列出可用模型：
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY" | jq '.models[].name'
```

### 3. Function Calling 不触发（指令被当作闲聊）

**可能原因**:
- 对话历史格式不正确（工具调用后缺少 assistant 确认消息）
- Thinking 模式未关闭

**排查**:
1. 使用 `/debug` 开启调试模式
2. 使用 `/history` 检查历史记录是否正常
3. 使用 `/reset` 重置后重试
4. 确认 `thinkingConfig: { thinkingBudget: 0 }` 已设置

### 4. TTS 文本为空

**原因**: Gemini 返回 functionCall 时通常不附带 text content

**解决**: 已在 `DialogManager.generateTtsFromChanges()` 中处理。如果新增了 Function 但 TTS 为空，需要在 `describeAction()` 中添加对应的中文描述映射。

### 5. "再高两度" 等相对指令不生效

**原因**: 多轮对话历史中工具调用格式不正确，导致模型丢失上下文

**验证**: 历史记录应为 4 条消息格式：
```
user → assistant(functionCall only) → tool(result) → assistant(text确认)
```

### 6. API 限流（429 错误）

**解决**:
- Gemini 免费额度: 15 RPM / 1M TPM
- 测试脚本已内置 1 秒间隔
- 如频繁限流，考虑申请更高配额

### 7. GLM Provider 报错 "余额不足"

**原因**: 智谱 API Key 余额为零

**解决**: 充值智谱账户或切换到 Gemini（`/model gemini`）

## 验证测试

```bash
# 快速验证 API 连通性（5 条用例）
npx tsx test/smoke-test.ts

# 完整端到端验证（17 条用例）
npx tsx test/e2e-test.ts
```

期望结果: 17/17 通过（100%）

## 状态重置

系统使用纯内存状态，以下方式可重置：

- REPL 中输入 `/reset` — 重置车辆状态和对话历史
- REPL 中输入 `/clear` — 仅清除对话历史
- 重启进程 — 完全重置

## 依赖版本

| 依赖 | 版本 | 用途 |
|------|------|------|
| dotenv | ^16.4.7 | 环境变量加载 |
| zod | ^3.24.1 | 类型校验 |
| typescript | ^5.7.0 | 类型检查 |
| tsx | ^4.19.0 | TypeScript 直接运行 |
| @types/node | ^22.10.0 | Node.js 类型定义 |

无外部基础设施依赖（无数据库、无 Redis、无 Docker）。
