import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/types/**',
        'src/main.ts', // 入口文件
        'src/cli/**', // CLI 交互文件
        'src/llm/providers/**', // 外部 API 提供者
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    deps: {
      interopDefault: true,
    },
  },
})
