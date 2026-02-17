# 运维手册

> 最后更新: 2026-02-17

## 部署流程

### 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 GEMINI_API_KEY

# 3. 启动 CLI REPL
npm start
```

### 环境变量

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `GEMINI_API_KEY` | 是 | Google Gemini API Key | - |
| `ZHIPU_API_KEY` | 否 | 智谱 GLM API Key | - |
| `CLAUDE_API_KEY` | 否 | Claude API Key（未实现） | - |
| `DEFAULT_MODEL` | 否 | 默认模型选择 | `gemini` |
| `SKILLS_DIR` | 否 | Skills 目录路径 | `skills` |

### 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| CLI REPL | - | 终端交互 |

## 启动与停止

### CLI 模式

```bash
# 启动
npm start

# 开发模式（热重载）
npm run dev

# Skill REPL 模式
npm run skill

# 退出 REPL
/quit
# 或 Ctrl+D / Ctrl+C
```

## REPL 命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `/help` | 显示帮助 | `/help` |
| `/state` | 查看当前车辆状态 | `/state` |
| `/model gemini` | 切换到 Gemini | `/model gemini` |
| `/model glm` | 切换到 GLM | `/model glm` |
| `/history` | 查看对话历史 | `/history` |
| `/clear` | 清除对话历史 | `/clear` |
| `/reset` | 重置车辆状态和对话历史 | `/reset` |
| `/debug` | 开关调试模式 | `/debug` |
| `/quit` | 退出 | `/quit` |

## 当前模型配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 默认模型 | Gemini 3 Flash Preview | `gemini-3-flash-preview` |
| API 端点 | `https://generativelanguage.googleapis.com/v1beta/models/` | |
| 温度 | 0.3 | 低温度保证指令准确性 |
| 最大输出 Token | 1024 | |
| Thinking 模式 | 关闭 | `thinkingBudget: 0` |
| Tool 配置 | AUTO 模式 | |

## 监控与告警

### 健康检查

```bash
# 运行冒烟测试验证系统
npm run test:smoke
```

### 性能指标

关键指标：
- 响应延迟 P95 < 2 秒
- 首 Token 延迟 < 1 秒
- 意图识别准确率 > 95%

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

**解决**: 检查 `src/llm/providers/gemini.ts` 中的 `GEMINI_MODEL` 常量，确认模型名称有效。

```bash
# 列出可用模型
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY" | jq '.models[].name'
```

### 3. Function Calling 不触发（指令被当作闲聊）

**可能原因**:
- 对话历史格式不正确
- Thinking 模式未关闭

**排查步骤**:
1. 使用 `/debug` 开启调试模式
2. 使用 `/history` 检查历史记录格式
3. 使用 `/reset` 重置后重试
4. 确认 `thinkingConfig: { thinkingBudget: 0 }` 已设置

### 4. TTS 文本为空

**原因**: Gemini 返回 functionCall 时通常不附带 text content

**解决**: 在 `describeAction()` 中添加对应的中文描述映射。

### 5. "再高两度" 等相对指令不生效

**原因**: 多轮对话历史中工具调用格式不正确

**验证**: 历史记录应为 4 条消息格式：
```
user → assistant(functionCall only) → tool(result) → assistant(text确认)
```

### 6. API 限流（429 错误）

**原因**: Gemini 免费额度有限

**解决**:
- Gemini 免费额度: 15 RPM / 1M TPM
- 测试脚本已内置 1 秒间隔
- 如频繁限流，考虑申请更高配额

### 7. GLM Provider 报错 "余额不足"

**原因**: 智谱 API Key 余额为零

**解决**: 充值智谱账户或切换到 Gemini（`/model gemini`）

### 8. Skill V2 系统问题

**排查步骤**:
1. 检查 `skills/` 目录结构是否正确
2. 验证 `skill.yaml` 格式是否有效
3. 查看启动日志中的 Skill 加载信息
4. 使用 `npm run skill` 测试 Skill REPL

**常见错误**:

| 错误 | 原因 | 解决 |
|------|------|------|
| `Skill not found` | Skill ID 不存在 | 检查 `skill.yaml` 中的 `id` |
| `Invalid YAML` | YAML 格式错误 | 使用 YAML 验证器检查 |
| `Capability not registered` | 能力处理器未注册 | 在 `SkillExecutor` 中注册 |

## 验证测试

```bash
# 快速验证 API 连通性（5 条用例）
npm run test:smoke

# Skill 系统演示
npm run skill:demo

# 完整单元测试
npm test

# 覆盖率报告
npm run test:coverage
```

## 状态重置

系统使用纯内存状态，以下方式可重置：

| 方式 | 效果 |
|------|------|
| REPL 中输入 `/reset` | 重置车辆状态和对话历史 |
| REPL 中输入 `/clear` | 仅清除对话历史 |
| 重启进程 | 完全重置 |

## 回滚流程

### 代码回滚

```bash
# 查看最近提交
git log --oneline -10

# 回滚到指定版本
git reset --hard <commit-hash>

# 重新安装依赖（如有变化）
npm install

# 重启 REPL
npm start
```

### 配置回滚

如果 `.env` 配置有问题，恢复默认配置：

```bash
cp .env.example .env.backup
# 手动恢复 API Key
```

### Skill 配置回滚

如果某个 Skill 配置有问题：

```bash
# 临时禁用 Skill
# 编辑 skills/my_skill/skill.yaml
# 设置 enabled: false
```

## 依赖版本

| 依赖 | 版本 | 用途 |
|------|------|------|
| dotenv | ^16.4.7 | 环境变量加载 |
| typescript | ^5.7.0 | 类型检查 |
| tsx | ^4.19.0 | TypeScript 直接运行 |
| vitest | ^1.6.0 | 测试框架 |
| @vitest/coverage-v8 | ^1.6.0 | 覆盖率报告 |
| @types/node | ^22.10.0 | Node.js 类型 |

**无外部基础设施依赖**（无数据库、无 Redis、无 Docker）。

## 架构变更记录

### 2026-02-17

- 实现文件系统级 Skills V2 架构
- 新增 `skills/` 目录存放 Skill 配置
- 新增 `src/skills/v2/` 模块：
  - `file-based-orchestrator.ts` - 编排器
  - `file-based-skill-registry.ts` - 注册表
  - `skill-executor.ts` - 执行器
  - `skill-loader.ts` - 加载器
  - `yaml-parser.ts` - YAML 解析器
- 支持三层渐进式披露加载策略
- 删除旧的代码级 Skill 实现（`src/skills/skills/`）

### 2026-02-16

- 删除 Web 模式和前端（`web/` 目录）
- 删除 `src/web/` 服务端代码
- 新增 Skill 系统（`src/skills/`）
- 清理未使用代码：
  - `src/core/domain-model.ts`
  - `src/core/index.ts`
  - `src/llm/providers/index.ts`
  - `src/controller/index.ts`

## 紧急联系

如遇严重问题：
1. 保存 REPL 输出日志
2. 记录错误信息和复现步骤
3. 联系开发团队

## 相关文档

- [开发指南](./CONTRIB.md)
- [架构总览](../codemaps/architecture.md)
