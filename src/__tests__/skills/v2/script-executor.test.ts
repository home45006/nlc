import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ScriptExecutor, createScriptExecutor } from '../../../skills/v2/script-executor.js'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('ScriptExecutor', () => {
  let executor: ScriptExecutor
  let tempDir: string

  beforeEach(() => {
    tempDir = join(tmpdir(), `nlc-test-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })
    executor = createScriptExecutor(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('execute', () => {
    it('应该成功执行有效的脚本', async () => {
      // 创建测试脚本
      const scriptPath = join(tempDir, 'test.sh')
      writeFileSync(scriptPath, '#!/bin/bash\necho "Hello World"')

      const config = {
        id: 'test',
        name: 'Test Script',
        path: 'test.sh',
        interpreter: 'bash' as const,
      }

      const result = await executor.execute(config)

      expect(result.success).toBe(true)
      expect(result.stdout).toContain('Hello World')
      expect(result.exitCode).toBe(0)
      expect(result.timedOut).toBe(false)
    })

    it('应该正确捕获脚本输出', async () => {
      const scriptPath = join(tempDir, 'output.sh')
      writeFileSync(scriptPath, '#!/bin/bash\necho "stdout"\necho "stderr" >&2')

      const config = {
        id: 'output',
        name: 'Output Script',
        path: 'output.sh',
        interpreter: 'bash' as const,
      }

      const result = await executor.execute(config)

      expect(result.stdout).toBe('stdout')
      expect(result.stderr).toBe('stderr')
    })

    it('应该正确处理脚本错误', async () => {
      const scriptPath = join(tempDir, 'error.sh')
      writeFileSync(scriptPath, '#!/bin/bash\nexit 1')

      const config = {
        id: 'error',
        name: 'Error Script',
        path: 'error.sh',
        interpreter: 'bash' as const,
      }

      const result = await executor.execute(config)

      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
    })

    it('应该正确处理脚本超时', async () => {
      const scriptPath = join(tempDir, 'slow.sh')
      writeFileSync(scriptPath, '#!/bin/bash\nsleep 5')

      const config = {
        id: 'slow',
        name: 'Slow Script',
        path: 'slow.sh',
        interpreter: 'bash' as const,
        timeout: 50, // 50ms
      }

      const result = await executor.execute(config)

      expect(result.success).toBe(false)
      expect(result.timedOut).toBe(true)
    }, 10000) // 增加测试超时时间

    it('应该正确传递参数给脚本', async () => {
      const scriptPath = join(tempDir, 'args.sh')
      writeFileSync(scriptPath, '#!/bin/bash\necho "Args: $@"')

      const config = {
        id: 'args',
        name: 'Args Script',
        path: 'args.sh',
        interpreter: 'bash' as const,
      }

      const result = await executor.execute(config, { args: ['hello', 'world'] })

      expect(result.stdout).toContain('Args: hello world')
    })

    it('应该正确设置环境变量', async () => {
      const scriptPath = join(tempDir, 'env.sh')
      writeFileSync(scriptPath, '#!/bin/bash\necho "TEST_VAR=$TEST_VAR"')

      const config = {
        id: 'env',
        name: 'Env Script',
        path: 'env.sh',
        interpreter: 'bash' as const,
        env: { TEST_VAR: 'test_value' },
      }

      const result = await executor.execute(config)

      expect(result.stdout).toContain('TEST_VAR=test_value')
    })

    it('应该处理不存在的脚本', async () => {
      const config = {
        id: 'notfound',
        name: 'Not Found',
        path: 'nonexistent.sh',
        interpreter: 'bash' as const,
      }

      const result = await executor.execute(config)

      expect(result.success).toBe(false)
      expect(result.error).toContain('脚本不存在')
    })
  })

  describe('registerConfig', () => {
    it('应该正确注册和获取配置', () => {
      const config = {
        id: 'registered',
        name: 'Registered Script',
        path: 'test.sh',
        interpreter: 'bash' as const,
      }

      executor.registerConfig(config)

      expect(executor.getConfig('registered')).toEqual(config)
    })

    it('应该返回所有已注册的配置', () => {
      const config1 = {
        id: 'config1',
        name: 'Config 1',
        path: 'test1.sh',
        interpreter: 'bash' as const,
      }
      const config2 = {
        id: 'config2',
        name: 'Config 2',
        path: 'test2.sh',
        interpreter: 'bash' as const,
      }

      executor.registerConfig(config1)
      executor.registerConfig(config2)

      const allConfigs = executor.getAllConfigs()
      expect(allConfigs).toHaveLength(2)
    })
  })
})
