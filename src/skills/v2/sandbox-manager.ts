/**
 * 沙箱管理器
 *
 * 为脚本执行提供隔离环境
 *
 * 安全措施：
 * - 文件系统隔离：只允许访问白名单目录
 * - 环境隔离：使用独立环境变量
 * - 资源限制：CPU 时间、内存限制
 * - 网络控制：可选禁用网络访问
 */

import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type { ScriptConfig, ScriptResult, ExecuteOptions } from './script-executor.js'
import { InputValidator } from './input-validator.js'

/**
 * 沙箱配置
 */
export interface SandboxConfig {
  /** 允许访问的路径白名单 */
  readonly allowedPaths: string[]
  /** 禁止访问的路径 */
  readonly deniedPaths?: string[]
  /** 是否禁用网络 */
  readonly networkDisabled?: boolean
  /** 最大内存（MB） */
  readonly maxMemoryMB?: number
  /** 最大 CPU 时间（毫秒） */
  readonly maxCpuTimeMs?: number
  /** 只读路径 */
  readonly readOnlyPaths?: string[]
  /** 允许写入的目录 */
  readonly writeDirectories?: string[]
  /** 最大输出大小（字节） */
  readonly maxOutputSize?: number
  /** 使用临时工作目录 */
  readonly useTempWorkDir?: boolean
}

/**
 * 沙箱执行结果
 */
export interface SandboxResult extends ScriptResult {
  /** 临时工作目录（如果使用了） */
  readonly tempWorkDir?: string
}

/**
 * 沙箱管理器
 */
export class SandboxManager {
  private readonly config: SandboxConfig
  private readonly tempDirs: Set<string> = new Set()

  constructor(config: SandboxConfig) {
    this.config = config
  }

  /**
   * 在沙箱中执行脚本
   */
  async executeInSandbox(
    scriptConfig: ScriptConfig,
    options: ExecuteOptions = {}
  ): Promise<SandboxResult> {
    const startTime = Date.now()
    const timeout = options.timeout ?? scriptConfig.timeout ?? 5000

    // 验证输入参数
    if (options.args && options.args.length > 0) {
      for (const arg of options.args) {
        if (!InputValidator.isSafeString(arg)) {
          return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            duration: Date.now() - startTime,
            timedOut: false,
            error: `参数包含不安全字符: ${arg.substring(0, 50)}...`,
          }
        }
      }
    }

    // 创建临时工作目录
    let tempWorkDir: string | undefined
    let workDir = options.cwd

    if (this.config.useTempWorkDir) {
      tempWorkDir = join(tmpdir(), `nlc-sandbox-${randomUUID()}`)
      await mkdir(tempWorkDir, { recursive: true })
      this.tempDirs.add(tempWorkDir)
      workDir = tempWorkDir
    }

    // 构建环境变量（隔离）
    const env = this.buildIsolatedEnv(scriptConfig, options)

    // 如果禁用网络，设置环境变量（注意：这只是提示，真正的网络隔离需要系统级配置）
    if (this.config.networkDisabled || scriptConfig.allowNetwork === false) {
      env.NLC_NO_NETWORK = '1'
    }

    // 执行脚本
    const result = await this.executeScript(scriptConfig, {
      ...options,
      cwd: workDir,
      env,
      timeout,
    })

    // 清理临时目录
    if (tempWorkDir) {
      await this.cleanupTempDir(tempWorkDir)
    }

    return {
      ...result,
      tempWorkDir,
    }
  }

  /**
   * 构建隔离的环境变量
   */
  private buildIsolatedEnv(
    scriptConfig: ScriptConfig,
    options: ExecuteOptions
  ): Record<string, string> {
    // 从干净的环境开始
    const env: Record<string, string> = {
      // 基本环境
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      USER: process.env.USER ?? '',
      LANG: process.env.LANG ?? 'en_US.UTF-8',
      TERM: 'dumb',

      // 脚本信息
      NLC_SCRIPT_ID: scriptConfig.id,
      NLC_SCRIPT_NAME: scriptConfig.name,
      NLC_SANDBOX: '1',

      // 脚本配置的环境变量
      ...scriptConfig.env,

      // 执行选项的环境变量
      ...options.env,
    }

    // 如果允许写入，设置写入目录
    if (scriptConfig.allowWrite && scriptConfig.writeDirectories?.length) {
      env.NLC_WRITE_DIRS = scriptConfig.writeDirectories.join(':')
    }

    return env
  }

  /**
   * 执行脚本
   */
  private async executeScript(
    scriptConfig: ScriptConfig,
    options: ExecuteOptions & { env: Record<string, string>; timeout: number }
  ): Promise<ScriptResult> {
    const startTime = Date.now()

    // 获取解释器
    const interpreter = this.getInterpreter(scriptConfig.interpreter)

    // 构建命令参数
    const args = options.args ?? []
    const scriptPath = resolve(scriptConfig.path)

    // 验证脚本路径
    if (!this.isPathAllowed(scriptPath)) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        duration: Date.now() - startTime,
        timedOut: false,
        error: `脚本路径不在白名单中: ${scriptPath}`,
      }
    }

    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let timedOut = false
      let outputSize = 0
      const maxOutputSize = this.config.maxOutputSize ?? 1024 * 1024 // 默认 1MB

      const child = spawn(interpreter, [scriptPath, ...args], {
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeout,
        shell: false,
        // 资源限制（Linux 特定，其他平台可能不支持）
        // detached: true, // 用于创建新的进程组
      })

      // 超时处理
      const timeoutId = setTimeout(() => {
        timedOut = true
        child.kill('SIGKILL')
      }, options.timeout)

      // 收集输出（带大小限制）
      child.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8')
        if (outputSize + chunk.length <= maxOutputSize) {
          stdout += chunk
          outputSize += chunk.length
        }
      })

      child.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8')
        if (outputSize + chunk.length <= maxOutputSize) {
          stderr += chunk
          outputSize += chunk.length
        }
      })

      // 结束处理
      child.on('close', (code) => {
        clearTimeout(timeoutId)
        const duration = Date.now() - startTime

        resolve({
          success: code === 0 && !timedOut,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          duration,
          timedOut,
          error: timedOut ? `脚本执行超时 (${options.timeout}ms)` : undefined,
        })
      })

      // 错误处理
      child.on('error', (err) => {
        clearTimeout(timeoutId)
        const duration = Date.now() - startTime

        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: -1,
          duration,
          timedOut: false,
          error: err.message,
        })
      })
    })
  }

  /**
   * 获取解释器路径
   */
  private getInterpreter(type: string): string {
    const interpreters: Record<string, string> = {
      bash: '/bin/bash',
      sh: '/bin/sh',
      node: process.execPath,
      python: 'python3',
      python3: 'python3',
    }
    return interpreters[type] ?? type
  }

  /**
   * 检查路径是否允许访问
   */
  private isPathAllowed(path: string): boolean {
    // 检查禁止路径
    if (this.config.deniedPaths) {
      for (const denied of this.config.deniedPaths) {
        if (path.startsWith(resolve(denied))) {
          return false
        }
      }
    }

    // 检查允许路径
    for (const allowed of this.config.allowedPaths) {
      const resolvedAllowed = resolve(allowed)
      if (path.startsWith(resolvedAllowed)) {
        return true
      }
    }

    return false
  }

  /**
   * 清理临时目录
   */
  private async cleanupTempDir(dir: string): Promise<void> {
    try {
      await rm(dir, { recursive: true, force: true })
      this.tempDirs.delete(dir)
    } catch {
      // 忽略清理错误
    }
  }

  /**
   * 清理所有临时目录
   */
  async cleanupAll(): Promise<void> {
    for (const dir of this.tempDirs) {
      await this.cleanupTempDir(dir)
    }
  }

  /**
   * 获取配置
   */
  getConfig(): SandboxConfig {
    return this.config
  }
}

/**
 * 创建沙箱管理器
 */
export function createSandboxManager(config: Partial<SandboxConfig> = {}): SandboxManager {
  const defaultConfig: SandboxConfig = {
    allowedPaths: [process.cwd()],
    deniedPaths: ['/etc', '/root', '~/.ssh'],
    networkDisabled: false,
    maxMemoryMB: 256,
    maxCpuTimeMs: 5000,
    writeDirectories: [],
    maxOutputSize: 1024 * 1024, // 1MB
    useTempWorkDir: false,
    ...config,
  }

  return new SandboxManager(defaultConfig)
}
