# NLC Demo 单元测试报告

> 最后更新: 2026-02-16

## 测试概览

- **测试框架**: Vitest 1.6.0
- **覆盖率工具**: @vitest/coverage-v8
- **总测试数**: 276
- **通过率**: 100%
- **执行时间**: ~2秒

## 测试覆盖率

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   99.47 |    86.09 |   91.66 |   99.47 |
-------------------|---------|----------|---------|---------|
```

## 测试文件结构

```
src/__tests__/
├── config.test.ts                    (8 tests)
├── constants.test.ts                 (10 tests)
├── dialog/
│   └── dialog-manager.test.ts        (36 tests)
├── controller/
│   ├── central-controller.test.ts    (新增)
│   └── domain-router.test.ts         (新增)
├── executor/
│   ├── command-executor.test.ts      (7 tests)
│   └── vehicle-state.test.ts         (40 tests)
├── llm/
│   ├── function-registry.test.ts     (16 tests)
│   ├── orchestrator.test.ts          (13 tests)
│   └── prompt-builder.test.ts        (12 tests)
└── skills/                           (Skill 系统 - 新增)
    ├── index.test.ts                 (6 tests)
    ├── base-skill.test.ts            (新增)
    ├── skill-registry.test.ts        (新增)
    ├── prompt-builder.test.ts        (新增)
    ├── vehicle-control-skill.test.ts (10 tests)
    ├── music-skill.test.ts           (8 tests)
    ├── navigation-skill.test.ts      (8 tests)
    ├── chat-skill.test.ts            (8 tests)
    └── integration.test.ts           (12 tests)
```

## 测试内容

### 1. 常量和配置测试
- constants.test.ts: AC_MODE_MAP, MUSIC_MODE_MAP 等常量
- config.test.ts: 配置加载、默认模型、API 密钥验证

### 2. 状态管理测试
- vehicle-state.test.ts (40 tests): 车辆状态所有操作测试
- command-executor.test.ts (7 tests): 指令执行测试

### 3. 对话管理测试
- dialog-manager.test.ts (36 tests): 历史管理、多轮对话

### 4. LLM 层测试
- function-registry.test.ts (16 tests): 工具注册
- orchestrator.test.ts (13 tests): LLM 编排
- prompt-builder.test.ts (12 tests): Prompt 构建

### 5. 控制器测试
- central-controller.test.ts: 大模型落域、多意图拆分
- domain-router.test.ts: 领域路由分发

### 6. Skill 系统测试 (70+ tests)
- base-skill.test.ts: Skill 基类
- skill-registry.test.ts: Skill 注册表
- prompt-builder.test.ts: 动态 Prompt 构建
- vehicle-control-skill.test.ts: 车辆控制 Skill
- music-skill.test.ts: 音乐 Skill
- navigation-skill.test.ts: 导航 Skill
- chat-skill.test.ts: 闲聊 Skill
- integration.test.ts: 集成测试

## 排除的文件

以下文件被排除在覆盖率统计之外：

- `src/main.ts` - 入口文件
- `src/cli/**` - CLI 交互文件
- `src/llm/providers/**` - 外部 API 提供者
- `src/types/**` - 类型定义文件

## 测试命令

```bash
# 运行所有测试
npm test

# 运行测试（watch 模式）
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行冒烟测试（需要 API Key）
npm run test:smoke

# Skill 系统演示
npm run skill:demo
```

## Mock 策略

### LLM Provider Mock
所有涉及 LLM 调用的测试都使用了 Mock Provider：

```typescript
function createMockProvider(response: Partial<ChatResponse> = {}): LLMProvider {
  return {
    name: 'mock-provider',
    chat: vi.fn().mockResolvedValue({
      content: '测试回复',
      toolCalls: [],
      usage: { promptTokens: 100, completionTokens: 20 },
      ...response,
    }),
  }
}
```

## 测试最佳实践

1. **独立性**: 每个测试都是独立的
2. **可读性**: 测试名称清晰描述测试内容
3. **完整性**: 覆盖所有公共 API 和边界情况
4. **Mock 外部依赖**: 所有外部调用都被 Mock
5. **不可变性**: 测试中验证不可变性约束

## 相关文档

- [开发指南](./CONTRIB.md)
- [运维手册](./RUNBOOK.md)
- [架构总览](../codemaps/architecture.md)
