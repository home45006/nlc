/**
 * 脚本配置加载器
 *
 * 从 YAML 文件加载脚本配置，并进行安全验证
 *
 * 安全措施：
 * - 路径规范化，防止目录遍历
 * - 脚本路径白名单验证
 * - 解释器类型限制
 */

import { readFile, stat } from 'node:fs/promises'
import { resolve, normalize, relative } from 'node:path'
import { pathExists } from '../../utils/file-utils.js'
import { parseSimpleYaml } from './yaml-parser.js'
import type { ScriptConfig, InterpreterType } from './script-executor.js'

/**
 * 脚本配置文件结构
 */
export interface ScriptsConfigFile {
  /** 脚本列表 */
  readonly scripts: ScriptConfigYaml[]
  /** 全局设置 */
  readonly settings?: {
    /** 默认超时时间 */
    readonly defaultTimeout?: number
    /** 默认解释器 */
    readonly defaultInterpreter?: InterpreterType
    /** 是否允许网络访问 */
    readonly allowNetwork?: boolean
    /** 是否允许写入文件 */
    readonly allowWrite?: boolean
    /** 允许写入的目录 */
    readonly writeDirectories?: string[]
  }
}

/**
 * YAML 中的脚本配置（部分字段可选）
 */
export interface ScriptConfigYaml {
  /** 脚本唯一标识 */
  readonly id: string
  /** 脚本名称 */
  readonly name: string
  /** 脚本路径 */
  readonly path: string
  /** 解释器 */
  readonly interpreter?: InterpreterType
  /** 超时时间 */
  readonly timeout?: number
  /** 环境变量 */
  readonly env?: Record<string, string>
  /** 允许访问的文件 */
  readonly allowedFiles?: string[]
  /** 是否允许网络 */
  readonly allowNetwork?: boolean
  /** 是否允许写入 */
  readonly allowWrite?: boolean
  /** 写入目录 */
  readonly writeDirectories?: string[]
  /** 描述 */
  readonly description?: string
  /** 关联能力 */
  readonly capabilities?: string[]
}

/**
 * 配置加载结果
 */
export interface ConfigLoadResult {
  /** 是否成功 */
  readonly success: boolean
  /** 加载的配置列表 */
  readonly configs: ScriptConfig[]
  /** 错误信息 */
  readonly errors: string[]
  /** 警告信息 */
  readonly warnings: string[]
}

/**
 * 允许的解释器类型
 */
const ALLOWED_INTERPRETERS: Set<InterpreterType> = new Set([
  'bash',
  'sh',
  'node',
  'python',
  'python3',
  'auto',
])

/**
 * 危险路径模式
 */
const DANGEROUS_PATTERNS = [
  /\.\./,           // 父目录引用
  /^\//,            // 绝对路径
  /^~/,             // 用户主目录
  /\0/,             // 空字节
  /\$\(/,           // 命令替换
  /`/,              // 反引号命令替换
  /\|/,             // 管道
  /;/,              // 命令分隔符
  /&&/,             // 命令连接
  /\|\|/,           // 命令连接
]

/**
 * 脚本配置加载器
 */
export class ScriptConfigLoader {
  private readonly scriptsBasePath: string
  private readonly configFileName: string
  private loadedConfigs: Map<string, ScriptConfig> = new Map()

  constructor(scriptsBasePath: string, configFileName = 'scripts.yaml') {
    this.scriptsBasePath = scriptsBasePath
    this.configFileName = configFileName
  }

  /**
   * 加载脚本配置
   */
  async load(): Promise<ConfigLoadResult> {
    const configs: ScriptConfig[] = []
    const errors: string[] = []
    const warnings: string[] = []

    const configPath = resolve(this.scriptsBasePath, this.configFileName)

    // 检查配置文件是否存在
    if (!await pathExists(configPath)) {
      return {
        success: true,
        configs: [],
        errors: [],
        warnings: [`脚本配置文件不存在: ${configPath}`],
      }
    }

    // 读取并解析 YAML
    let configFile: ScriptsConfigFile
    try {
      const content = await readFile(configPath, 'utf-8')
      const parsed = parseSimpleYaml(content)
      configFile = parsed as ScriptsConfigFile
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        configs: [],
        errors: [`解析配置文件失败: ${message}`],
        warnings: [],
      }
    }

    // 验证配置结构
    if (!configFile.scripts || !Array.isArray(configFile.scripts)) {
      return {
        success: false,
        configs: [],
        errors: ['配置文件缺少 scripts 字段或格式错误'],
        warnings: [],
      }
    }

    // 获取全局设置
    const settings = configFile.settings ?? {}
    const defaultTimeout = settings.defaultTimeout ?? 5000
    const defaultInterpreter = settings.defaultInterpreter ?? 'auto'

    // 验证每个脚本配置
    for (let i = 0; i < configFile.scripts.length; i++) {
      const scriptYaml = configFile.scripts[i]
      const validationResult = await this.validateScriptConfig(
        scriptYaml,
        defaultTimeout,
        defaultInterpreter,
        settings
      )

      if (validationResult.valid && validationResult.config) {
        configs.push(validationResult.config)
        this.loadedConfigs.set(validationResult.config.id, validationResult.config)
      } else {
        errors.push(`脚本 #${i + 1}: ${validationResult.error}`)
      }

      // 收集警告
      validationResult.warnings.forEach(w => warnings.push(`脚本 ${scriptYaml.id}: ${w}`))
    }

    return {
      success: errors.length === 0,
      configs,
      errors,
      warnings,
    }
  }

  /**
   * 验证单个脚本配置
   */
  private async validateScriptConfig(
    yaml: ScriptConfigYaml,
    defaultTimeout: number,
    defaultInterpreter: InterpreterType,
    globalSettings: NonNullable<ScriptsConfigFile['settings']>
  ): Promise<{
    valid: boolean
    config?: ScriptConfig
    error?: string
    warnings: string[]
  }> {
    const warnings: string[] = []

    // 验证必需字段
    if (!yaml.id || typeof yaml.id !== 'string') {
      return { valid: false, error: '缺少 id 字段', warnings }
    }

    if (!yaml.name || typeof yaml.name !== 'string') {
      return { valid: false, error: '缺少 name 字段', warnings }
    }

    if (!yaml.path || typeof yaml.path !== 'string') {
      return { valid: false, error: '缺少 path 字段', warnings }
    }

    // 验证 ID 格式（只允许字母、数字、下划线、连字符）
    if (!/^[a-zA-Z0-9_-]+$/.test(yaml.id)) {
      return { valid: false, error: `ID 格式无效: ${yaml.id}，只允许字母、数字、下划线、连字符`, warnings }
    }

    // 验证路径安全性
    const pathValidation = this.validatePath(yaml.path)
    if (!pathValidation.valid) {
      return { valid: false, error: pathValidation.error!, warnings }
    }

    // 验证解释器类型
    const interpreter = yaml.interpreter ?? defaultInterpreter
    if (!ALLOWED_INTERPRETERS.has(interpreter)) {
      return { valid: false, error: `不支持的解释器: ${interpreter}`, warnings }
    }

    // 检查脚本文件是否存在
    const fullPath = resolve(this.scriptsBasePath, yaml.path)
    try {
      const fileStat = await stat(fullPath)
      if (!fileStat.isFile()) {
        return { valid: false, error: `路径不是文件: ${yaml.path}`, warnings }
      }
    } catch {
      warnings.push(`脚本文件不存在: ${yaml.path}`)
    }

    // 构建完整配置
    const config: ScriptConfig = {
      id: yaml.id,
      name: yaml.name,
      path: yaml.path,
      interpreter,
      timeout: yaml.timeout ?? defaultTimeout,
      env: yaml.env,
      allowedFiles: yaml.allowedFiles,
      allowNetwork: yaml.allowNetwork ?? globalSettings.allowNetwork ?? true,
      allowWrite: yaml.allowWrite ?? globalSettings.allowWrite ?? false,
      writeDirectories: yaml.writeDirectories ?? globalSettings.writeDirectories ?? [],
      description: yaml.description,
      capabilities: yaml.capabilities,
    }

    return { valid: true, config, warnings }
  }

  /**
   * 验证路径安全性
   */
  private validatePath(path: string): { valid: boolean; error?: string } {
    // 检查危险模式
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(path)) {
        return { valid: false, error: `路径包含不允许的字符或模式: ${path}` }
      }
    }

    // 规范化路径并检查是否在基础目录内
    const normalizedPath = normalize(path)
    const fullPath = resolve(this.scriptsBasePath, normalizedPath)
    const relativePath = relative(this.scriptsBasePath, fullPath)

    // 如果相对路径以 .. 开头，说明在基础目录之外
    if (relativePath.startsWith('..')) {
      return { valid: false, error: `路径超出允许范围: ${path}` }
    }

    return { valid: true }
  }

  /**
   * 获取已加载的配置
   */
  getConfig(id: string): ScriptConfig | undefined {
    return this.loadedConfigs.get(id)
  }

  /**
   * 获取所有已加载的配置
   */
  getAllConfigs(): ScriptConfig[] {
    return Array.from(this.loadedConfigs.values())
  }

  /**
   * 根据能力查找脚本
   */
  findByCapability(capability: string): ScriptConfig[] {
    return this.getAllConfigs().filter(
      config => config.capabilities?.includes(capability)
    )
  }

  /**
   * 获取脚本基础路径
   */
  getScriptsBasePath(): string {
    return this.scriptsBasePath
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.loadedConfigs.clear()
  }
}

/**
 * 创建脚本配置加载器
 */
export function createScriptConfigLoader(
  scriptsBasePath: string,
  configFileName = 'scripts.yaml'
): ScriptConfigLoader {
  return new ScriptConfigLoader(scriptsBasePath, configFileName)
}
