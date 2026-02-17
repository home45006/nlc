/**
 * 脚本执行器
 *
 * 安全地执行外部脚本，支持 bash、node、python 等解释器
 *
 * 安全措施：
 * - 使用 spawn 而非 exec，避免 shell 注入
 * - 参数化传递，不拼接命令字符串
 * - 超时控制，防止无限执行
 * - 资源限制（可选）
 */

import { spawn } from 'node:child_process'
import { access, stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

/**
 * 解释器类型
 */
export type InterpreterType = 'bash' | 'sh' | 'node' | 'python' | 'python3' | 'auto'

/**
 * 脚本配置
 */
export interface ScriptConfig {
  /** 脚本唯一标识 */
  readonly id: string
  /** 脚本名称 */
  readonly name: string
  /** 脚本路径（相对于 scripts 目录） */
  readonly path: string
  /** 解释器类型 */
  readonly interpreter: InterpreterType
  /** 执行超时时间（毫秒），默认 5000 */
  readonly timeout?: number
  /** 环境变量 */
  readonly env?: Record<string, string>
  /** 允许访问的文件白名单 */
  readonly allowedFiles?: string[]
  /** 是否允许网络访问 */
  readonly allowNetwork?: boolean
  /** 是否允许写入文件 */
  readonly allowWrite?: boolean
  /** 允许写入的目录 */
  readonly writeDirectories?: string[]
  /** 脚本描述 */
  readonly description?: string
  /** 关联的能力列表 */
  readonly capabilities?: string[]
}

/**
 * 脚本执行结果
 */
export interface ScriptResult {
  /** 是否成功（exit code === 0） */
  readonly success: boolean
  /** 标准输出 */
  readonly stdout: string
  /** 标准错误 */
  readonly stderr: string
  /** 退出码 */
  readonly exitCode: number | null
  /** 执行时长（毫秒） */
  readonly duration: number
  /** 是否超时 */
  readonly timedOut: boolean
  /** 错误信息（如果有） */
  readonly error?: string
}

/**
 * 执行选项
 */
export interface ExecuteOptions {
  /** 传递给脚本的参数 */
  readonly args?: string[]
  /** 额外的环境变量 */
  readonly env?: Record<string, string>
  /** 覆盖超时时间 */
  readonly timeout?: number
  /** 工作目录 */
  readonly cwd?: string
}

/**
 * 解释器路径映射
 */
const INTERPRETER_PATHS: Record<InterpreterType, string | string[]> = {
  bash: '/bin/bash',
  sh: '/bin/sh',
  node: process.execPath, // 使用当前 node 进程
  python: ['python3', 'python'],
  python3: 'python3',
  auto: '', // 根据 shebang 或扩展名自动检测
}

/**
 * 文件扩展名到解释器的映射
 */
const EXTENSION_INTERPRETER: Record<string, InterpreterType> = {
  '.sh': 'bash',
  '.bash': 'bash',
  '.js': 'node',
  '.mjs': 'node',
  '.cjs': 'node',
  '.py': 'python3',
}

/**
 * 脚本执行器
 */
export class ScriptExecutor {
  private readonly scriptsBasePath: string
  private readonly configCache: Map<string, ScriptConfig> = new Map()

  constructor(scriptsBasePath: string) {
    this.scriptsBasePath = scriptsBasePath
  }

  /**
   * 获取脚本基础路径
   */
  getScriptsBasePath(): string {
    return this.scriptsBasePath
  }

  /**
   * 执行脚本
   */
  async execute(
    config: ScriptConfig,
    options: ExecuteOptions = {}
  ): Promise<ScriptResult> {
    const startTime = Date.now()
    const timeout = options.timeout ?? config.timeout ?? 5000

    // 解析脚本完整路径
    const scriptPath = resolve(this.scriptsBasePath, config.path)

    // 验证脚本存在
    try {
      await access(scriptPath)
    } catch {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        duration: Date.now() - startTime,
        timedOut: false,
        error: `脚本不存在: ${config.path}`,
      }
    }

    // 获取解释器
    const interpreter = await this.getInterpreter(config.interpreter, scriptPath)

    // 构建环境变量
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...config.env,
      ...options.env,
      // 标记执行上下文
      NLC_SCRIPT_ID: config.id,
      NLC_SCRIPT_NAME: config.name,
    }

    // 如果不允许网络访问，设置相关环境变量（可选实现）
    if (config.allowNetwork === false) {
      env.NLC_NO_NETWORK = '1'
    }

    // 构建命令参数
    const args = options.args ?? []
    const commandArgs = interpreter === process.execPath || config.interpreter === 'node'
      ? [scriptPath, ...args]
      : [scriptPath, ...args]

    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let timedOut = false

      // 根据解释器类型选择执行方式
      const spawnOptions = {
        cwd: options.cwd ?? dirname(scriptPath),
        env,
        timeout,
        // 不使用 shell，防止命令注入
        shell: false,
      }

      const child = spawn(interpreter, commandArgs, spawnOptions)

      // 设置超时
      const timeoutId = setTimeout(() => {
        timedOut = true
        child.kill('SIGKILL')
      }, timeout)

      // 收集输出
      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString('utf8')
      })

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString('utf8')
      })

      // 处理结束
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
          error: timedOut ? `脚本执行超时 (${timeout}ms)` : undefined,
        })
      })

      // 处理错误
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
  private async getInterpreter(
    type: InterpreterType,
    scriptPath: string
  ): Promise<string> {
    if (type === 'auto') {
      // 根据文件扩展名判断
      const ext = scriptPath.substring(scriptPath.lastIndexOf('.'))
      const detected = EXTENSION_INTERPRETER[ext] ?? 'bash'
      return this.resolveInterpreterPath(detected)
    }

    return this.resolveInterpreterPath(type)
  }

  /**
   * 解析解释器路径
   */
  private async resolveInterpreterPath(type: InterpreterType): Promise<string> {
    const paths = INTERPRETER_PATHS[type]
    if (typeof paths === 'string') {
      return paths || type
    }

    // 对于可能有多个路径的解释器（如 python），尝试找到可用的
    if (Array.isArray(paths)) {
      for (const p of paths) {
        try {
          await stat(p)
          return p
        } catch {
          // 尝试下一个
        }
      }
      // 如果都找不到，返回第一个，让系统处理
      return paths[0]
    }

    return type
  }

  /**
   * 注册脚本配置（用于缓存）
   */
  registerConfig(config: ScriptConfig): void {
    this.configCache.set(config.id, config)
  }

  /**
   * 获取脚本配置
   */
  getConfig(id: string): ScriptConfig | undefined {
    return this.configCache.get(id)
  }

  /**
   * 获取所有已注册的脚本配置
   */
  getAllConfigs(): ScriptConfig[] {
    return Array.from(this.configCache.values())
  }

  /**
   * 获取脚本基础路径
   */
  getScriptsBasePath(): string {
    return this.scriptsBasePath
  }
}

/**
 * 创建脚本执行器
 */
export function createScriptExecutor(scriptsBasePath: string): ScriptExecutor {
  return new ScriptExecutor(scriptsBasePath)
}
