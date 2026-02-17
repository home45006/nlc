/**
 * 结果格式化器
 *
 * 格式化脚本执行结果，支持多种输出格式
 */

import type { ScriptResult } from './script-executor.js'

/**
 * 输出格式类型
 */
export type OutputFormat = 'json' | 'text' | 'structured' | 'auto'

/**
 * 格式化选项
 */
export interface FormatOptions {
  /** 输出格式 */
  format?: OutputFormat
  /** 输出模板（使用 {field} 占位符） */
  template?: string
  /** 是否包含元数据 */
  includeMetadata?: boolean
  /** 最大输出长度 */
  maxLength?: number
}

/**
 * 格式化结果
 */
export interface FormattedResult {
  /** 格式化后的文本 */
  text: string
  /** TTS 友好的文本（简化版） */
  ttsText: string
  /** 是否被截断 */
  truncated: boolean
  /** 解析的数据 */
  data?: Record<string, unknown>
}

/**
 * 结果格式化器
 */
export class ResultFormatter {
  private readonly defaultMaxLength: number

  constructor(defaultMaxLength = 2000) {
    this.defaultMaxLength = defaultMaxLength
  }

  /**
   * 格式化脚本结果
   */
  format(result: ScriptResult, options: FormatOptions = {}): FormattedResult {
    const maxLength = options.maxLength ?? this.defaultMaxLength
    const format = options.format ?? 'auto'

    // 解析输出数据
    const data = this.parseOutput(result.stdout)

    // 根据格式类型处理
    let text: string
    if (options.template) {
      text = this.applyTemplate(options.template, data)
    } else {
      text = this.formatByType(result, data, format)
    }

    // 生成 TTS 文本（简化版）
    const ttsText = this.generateTtsText(result, data)

    // 检查截断
    const truncated = text.length > maxLength
    if (truncated) {
      text = text.substring(0, maxLength) + '...'
    }

    return {
      text,
      ttsText: truncated ? ttsText.substring(0, maxLength) : ttsText,
      truncated,
      data,
    }
  }

  /**
   * 解析脚本输出
   */
  private parseOutput(stdout: string): Record<string, unknown> {
    const trimmed = stdout.trim()

    // 尝试解析 JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        // 解析失败，继续处理
      }
    }

    // 尝试解析键值对（每行一个）
    if (trimmed.includes(':') && trimmed.includes('\n')) {
      const data: Record<string, unknown> = {}
      for (const line of trimmed.split('\n')) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim()
          data[key] = value
        }
      }
      if (Object.keys(data).length > 0) {
        return data
      }
    }

    // 返回原始输出
    return { rawOutput: trimmed }
  }

  /**
   * 根据类型格式化
   */
  private formatByType(
    result: ScriptResult,
    data: Record<string, unknown>,
    format: OutputFormat
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)

      case 'text':
        return result.stdout

      case 'structured':
        return this.formatStructured(data)

      case 'auto':
      default:
        return this.formatAuto(result, data)
    }
  }

  /**
   * 自动选择格式
   */
  private formatAuto(result: ScriptResult, data: Record<string, unknown>): string {
    // 如果有错误，返回错误信息
    if (!result.success) {
      return `执行失败: ${result.error ?? result.stderr}`
    }

    // 如果是结构化数据，格式化输出
    if (data.rawOutput === undefined || Object.keys(data).length > 1) {
      return this.formatStructured(data)
    }

    // 返回原始输出
    return result.stdout
  }

  /**
   * 格式化结构化数据
   */
  private formatStructured(data: Record<string, unknown>): string {
    const parts: string[] = []

    // 按优先级顺序输出字段
    const priorityFields = [
      'city', 'temperature', 'condition', 'humidity', 'wind',
      'expression', 'result',
      'cpu', 'memory', 'disk',
      'hostname', 'system',
    ]

    // 输出优先字段
    for (const field of priorityFields) {
      if (data[field] !== undefined) {
        const label = this.getFieldLabel(field)
        parts.push(`${label}: ${data[field]}`)
      }
    }

    // 输出其他字段
    for (const [key, value] of Object.entries(data)) {
      if (!priorityFields.includes(key) && key !== 'rawOutput') {
        const label = this.getFieldLabel(key)
        parts.push(`${label}: ${value}`)
      }
    }

    // 如果没有结构化数据，返回原始输出
    if (parts.length === 0 && data.rawOutput) {
      return String(data.rawOutput)
    }

    return parts.join(', ')
  }

  /**
   * 获取字段的友好标签
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      city: '城市',
      temperature: '温度',
      condition: '天气',
      humidity: '湿度',
      wind: '风力',
      expression: '表达式',
      result: '结果',
      cpu: 'CPU',
      memory: '内存',
      disk: '磁盘',
      hostname: '主机名',
      system: '系统',
      timestamp: '时间',
      error: '错误',
    }
    return labels[field] ?? field
  }

  /**
   * 应用模板
   */
  private applyTemplate(template: string, data: Record<string, unknown>): string {
    let result = template

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value ?? ''))
    }

    return result
  }

  /**
   * 生成 TTS 文本
   */
  private generateTtsText(result: ScriptResult, data: Record<string, unknown>): string {
    // 如果执行失败
    if (!result.success) {
      return `抱歉，脚本执行失败。${result.error ?? ''}`
    }

    // 天气结果
    if (data.city && data.temperature !== undefined) {
      const parts = [`${data.city}当前天气`]
      if (data.condition) parts.push(`${data.condition}`)
      parts.push(`温度${data.temperature}度`)
      if (data.humidity) parts.push(`湿度${data.humidity}%`)
      return parts.join('，')
    }

    // 计算结果
    if (data.expression && data.result !== undefined) {
      return `${data.expression} 等于 ${data.result}`
    }

    // 系统信息
    if (data.hostname || data.system) {
      const parts = []
      if (data.hostname) parts.push(`主机 ${data.hostname}`)
      if (data.system) parts.push(`系统 ${data.system}`)
      return parts.join('，')
    }

    // 默认：返回原始输出的摘要
    if (data.rawOutput) {
      const output = String(data.rawOutput)
      if (output.length > 100) {
        return output.substring(0, 100) + '...'
      }
      return output
    }

    return '脚本执行完成'
  }
}

/**
 * 创建结果格式化器
 */
export function createResultFormatter(defaultMaxLength?: number): ResultFormatter {
  return new ResultFormatter(defaultMaxLength)
}
