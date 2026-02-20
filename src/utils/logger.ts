import chalk from 'chalk'

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// 日志配置
export interface LoggerConfig {
  level: LogLevel
  showTimestamp: boolean
  showLevel: boolean
}

// 日志级别优先级
const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']

export class Logger {
  private static instance: Logger | null = null
  private config: LoggerConfig

  private constructor(config: Partial<LoggerConfig> = {}) {
    const envLevel = process.env.NLC_LOG_LEVEL as LogLevel | undefined
    this.config = {
      level: config.level ?? (envLevel && LOG_LEVELS.includes(envLevel) ? envLevel : 'info'),
      showTimestamp: config.showTimestamp ?? false,
      showLevel: config.showLevel ?? true,
    }
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!this.instance || config) {
      this.instance = new Logger(config)
    }
    return this.instance
  }

  /** 设置日志级别 */
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /** 获取当前日志级别 */
  getLevel(): LogLevel {
    return this.config.level
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.config.level)
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = []

    if (this.config.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`)
    }
    if (this.config.showLevel) {
      const levelTag = level.toUpperCase().padEnd(5)
      parts.push(this.formatLevel(level, levelTag))
    }
    parts.push(message)

    return parts.join(' ')
  }

  private formatLevel(level: LogLevel, text: string): string {
    switch (level) {
      case 'debug':
        return chalk.gray(text)
      case 'info':
        return chalk.green(text)
      case 'warn':
        return chalk.yellow(text)
      case 'error':
        return chalk.red(text)
    }
  }

  /** 调试信息 */
  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return
    console.debug(this.formatMessage('debug', message), ...args)
  }

  /** 一般信息 */
  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return
    console.log(this.formatMessage('info', message), ...args)
  }

  /** 警告信息 */
  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return
    console.warn(this.formatMessage('warn', message), ...args)
  }

  /** 错误信息 */
  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return
    console.error(this.formatMessage('error', message), ...args)
  }

  /** 创建带模块前缀的 logger */
  module(moduleName: string): Logger {
    const self = this
    const createPrefix = (level: LogLevel) => {
      return (message: string, ...args: unknown[]) => {
        self[level](`[${moduleName}] ${message}`, ...args)
      }
    }

    return {
      setLevel: this.setLevel.bind(this),
      getLevel: this.getLevel.bind(this),
      debug: createPrefix('debug'),
      info: createPrefix('info'),
      warn: createPrefix('warn'),
      error: createPrefix('error'),
    } as Logger
  }
}

// 默认导出单例
export const logger = Logger.getInstance()
