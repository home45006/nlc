# E2E 测试说明

## 测试概述

本项目的 E2E 测试使用 Playwright 框架，覆盖了智能座舱语言控制系统 Web 应用的关键用户流程。

## 测试文件结构

```
tests/e2e/
├── fixtures/
│   └── mockWebSocket.ts     # WebSocket Mock fixture
├── pages/
│   └── MainPage.ts          # Page Object Model
├── chat.spec.ts             # 对话消息测试
├── dark-mode.spec.ts        # 暗色模式测试
├── header-controls.spec.ts  # Header 控制测试
├── page-load.spec.ts        # 页面加载测试
├── responsive.spec.ts       # 响应式布局测试
└── vehicle-state.spec.ts    # 车辆状态测试
```

## 运行测试

### 前置条件

1. 安装依赖：
   ```bash
   npm install
   ```

2. 安装 Playwright 浏览器：
   ```bash
   npx playwright install
   ```

### 启动前端服务

测试需要前端服务运行在 `http://localhost:5173`：

```bash
# 在一个终端中启动前端开发服务器
npm run dev
```

### 运行测试命令

```bash
# 运行所有测试
npm run test:e2e

# 运行特定浏览器测试
npx playwright test --project=chromium

# 带界面运行测试（调试模式）
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report

# 生成测试代码
npm run test:e2e:codegen
```

## 测试覆盖场景

### 1. 页面加载与连接 (`page-load.spec.ts`)
- 页面正确加载并显示标题
- 欢迎消息和示例指令显示
- WebSocket 连接状态管理
- 初始车辆状态显示
- 历史消息恢复

### 2. 对话消息功能 (`chat.spec.ts`)
- 发送消息并显示在列表中
- 处理中状态显示
- 接收助手响应
- 空调/温度/导航/音乐指令解析
- 空消息处理
- 键盘快捷键（Enter/Shift+Enter）
- 输入框状态管理

### 3. 车辆状态显示 (`vehicle-state.spec.ts`)
- 所有车辆控制组件显示
- 空调/电量/音乐/导航初始状态
- 车辆俯视图 SVG 显示
- 自定义初始状态
- 低电量警告样式

### 4. 暗色模式 (`dark-mode.spec.ts`)
- 切换按钮显示
- 模式切换功能
- 图标变化
- 背景色和样式变化
- localStorage 持久化
- 页面刷新后状态恢复

### 5. Header 控制功能 (`header-controls.spec.ts`)
- 模型选择器功能
- 下拉菜单交互
- 重置按钮确认对话框
- 布局元素验证

### 6. 响应式布局 (`responsive.spec.ts`)
- 移动端（Pixel 5）：垂直布局
- 平板端（768x1024）：水平布局
- 小屏幕（320x568）：基本显示
- 大屏幕（1920x1080）：最大宽度限制

## WebSocket Mock

由于后端需要 LLM API Key，测试使用 WebSocket Mock 来模拟后端响应：

```typescript
// 使用 Mock
await mockWebSocket({
  vehicleState: { ... },
  history: [ ... ],
  model: 'gemini'
})
```

Mock 支持以下功能：
- 模拟初始化消息
- 模拟对话响应
- 解析自然语言指令（空调、温度、导航、音乐等）
- 处理中状态
- 连接错误模拟

## 测试配置

测试配置在 `playwright.config.ts` 中：

- **浏览器**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **报告**: HTML, JUnit XML, JSON
- **失败截图**: 启用
- **失败视频**: 保留
- **追踪**: 首次重试时开启

## 最佳实践

1. **使用 Page Object Model**：所有页面交互封装在 Page Object 中
2. **Mock WebSocket**：避免依赖真实后端
3. **语义化选择器**：优先使用文本内容和语义化选择器
4. **等待策略**：使用 `waitForLoadState` 和自定义等待函数
5. **独立测试**：每个测试独立运行，不依赖其他测试

## 常见问题

### Q: 测试失败显示 `net::ERR_CONNECTION_REFUSED`

A: 确保前端服务正在运行：
```bash
npm run dev
```

### Q: 测试找不到元素

A: 检查 Page Object 中的选择器是否与实际 DOM 匹配。可以添加 `data-testid` 属性来提高稳定性。

### Q: WebSocket Mock 不生效

A: 确保 `mockWebSocket` 在 `goto` 之前调用：
```typescript
await mockWebSocket({})
const mainPage = new MainPage(page)
await mainPage.goto()
```
