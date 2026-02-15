# 运维手册

> 最后更新: 2026-02-15

## 部署流程

### 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 GEMINI_API_KEY

# 3. CLI 模式启动
npm start

# 4. Web 模式启动
npm run web
```

### 生产环境

```bash
# 1. 构建前端
cd web && npm install && npm run build && cd ..

# 2. 启动服务（自动服务静态文件）
npm run web
```

访问 http://localhost:3000

### 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| CLI REPL | - | 终端交互 |
| Web Server | 3000 | HTTP + WebSocket |
| 前端开发 | 5173 | Vite 开发服务器 |

## 启动与停止

### CLI 模式

```bash
# 启动
npm start

# 退出 REPL
/quit
# 或 Ctrl+D / Ctrl+C
```

### Web 模式

```bash
# 启动
npm run web

# 后台运行（生产环境）
nohup npm run web > logs/server.log 2>&1 &

# 停止
# 找到进程并 kill
lsof -i :3000
kill <PID>
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
# 检查 Web 服务是否运行
curl http://localhost:3000/api/health

# 检查 WebSocket 连接
wscat -c ws://localhost:3000/ws
```

### 日志查看

```bash
# 实时日志（如果使用 nohup）
tail -f logs/server.log

# 查看最近 100 行
tail -n 100 logs/server.log
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

### 8. WebSocket 连接失败

**排查步骤**:
1. 确认服务已启动: `lsof -i :3000`
2. 检查防火墙设置
3. 查看服务端日志

### 9. 前端页面空白

**排查步骤**:
1. 确认前端已构建: `cd web && npm run build`
2. 检查浏览器控制台错误
3. 确认 API 端点配置正确

## 验证测试

```bash
# 快速验证 API 连通性（5 条用例）
npm run test:smoke

# 完整端到端验证（17 条用例）
npm run test:e2e
```

期望结果: 17/17 通过（100%）

## 状态重置

系统使用纯内存状态，以下方式可重置：

| 方式 | 效果 |
|------|------|
| REPL 中输入 `/reset` | 重置车辆状态和对话历史 |
| REPL 中输入 `/clear` | 仅清除对话历史 |
| 重启进程 | 完全重置 |
| Web 模式刷新页面 | 重载历史（localStorage） |

## 回滚流程

### 代码回滚

```bash
# 查看最近提交
git log --oneline -10

# 回滚到指定版本
git reset --hard <commit-hash>

# 重新安装依赖（如有变化）
npm install

# 重启服务
npm run web
```

### 配置回滚

如果 `.env` 配置有问题，恢复默认配置：

```bash
cp .env.example .env.backup
# 手动恢复 API Key
```

## 依赖版本

| 依赖 | 版本 | 用途 |
|------|------|------|
| fastify | ^5.7.4 | Web 框架 |
| @fastify/cors | ^11.2.0 | CORS 支持 |
| @fastify/static | ^9.0.0 | 静态文件服务 |
| @fastify/websocket | ^11.2.0 | WebSocket 支持 |
| dotenv | ^16.4.7 | 环境变量加载 |
| pino-pretty | ^13.1.3 | 日志格式化 |
| typescript | ^5.7.0 | 类型检查 |
| tsx | ^4.19.0 | TypeScript 直接运行 |
| vitest | ^1.6.0 | 测试框架 |

**无外部基础设施依赖**（无数据库、无 Redis、无 Docker）。

## 紧急联系

如遇严重问题：
1. 保存日志: `tail -n 1000 logs/server.log > incident.log`
2. 记录错误信息和复现步骤
3. 联系开发团队

## 相关文档

- [开发指南](/Users/zhangdawei/david/github/nlc/docs/CONTRIB.md)
- [架构总览](/Users/zhangdawei/david/github/nlc/codemaps/architecture.md)
- [系统设计](/Users/zhangdawei/david/github/nlc/docs/system-design.md)
