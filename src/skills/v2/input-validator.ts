/**
 * 输入验证器
 *
 * 验证传递给脚本的输入，防止注入攻击
 *
 * 安全措施：
 * - 参数类型验证
 * - 字符串长度限制
 * - 特殊字符过滤
 * - 敏感信息检测
 */

/**
 * 验证规则
 */
export interface ValidationRule {
  /** 参数名 */
  readonly name: string
  /** 参数类型 */
  readonly type: 'string' | 'number' | 'boolean' | 'enum'
  /** 是否必需 */
  readonly required?: boolean
  /** 最小长度（string） */
  readonly minLength?: number
  /** 最大长度（string） */
  readonly maxLength?: number
  /** 最小值（number） */
  readonly min?: number
  /** 最大值（number） */
  readonly max?: number
  /** 枚举值（enum） */
  readonly enumValues?: string[]
  /** 正则模式（string） */
  readonly pattern?: string
  /** 自定义验证函数 */
  readonly validate?: (value: unknown) => boolean | string
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  readonly valid: boolean
  /** 错误信息 */
  readonly errors: string[]
  /** 警告信息 */
  readonly warnings: string[]
  /** 清理后的值 */
  readonly sanitizedValue?: unknown
}

/**
 * 危险字符模式
 */
const DANGEROUS_PATTERNS = [
  // Shell 注入
  { pattern: /[;&|`$]/, message: '包含 shell 特殊字符' },
  { pattern: /\$\(/, message: '包含命令替换' },
  { pattern: /\$\{/, message: '包含变量替换' },
  { pattern: /`/, message: '包含反引号命令替换' },

  // 路径遍历
  { pattern: /\.\./, message: '包含路径遍历' },
  { pattern: /~/, message: '包含用户主目录引用' },

  // 其他危险模式
  { pattern: /\0/, message: '包含空字节' },
  { pattern: /\n|\r/, message: '包含换行符' },
]

/**
 * 敏感信息模式
 */
const SENSITIVE_PATTERNS = [
  { pattern: /password/i, message: '可能包含密码' },
  { pattern: /secret/i, message: '可能包含密钥' },
  { pattern: /api[_-]?key/i, message: '可能包含 API 密钥' },
  { pattern: /token/i, message: '可能包含令牌' },
  { pattern: /private[_-]?key/i, message: '可能包含私钥' },
  { pattern: /[a-zA-Z0-9]{32,}/, message: '可能包含长密钥字符串' },
]

/**
 * 输入验证器
 */
export class InputValidator {
  private readonly rules: Map<string, ValidationRule> = new Map()
  private readonly maxStringLength: number
  private readonly allowSensitivePatterns: boolean

  constructor(options?: {
    /** 最大字符串长度 */
    maxStringLength?: number
    /** 是否允许可能的敏感信息 */
    allowSensitivePatterns?: boolean
  }) {
    this.maxStringLength = options?.maxStringLength ?? 1000
    this.allowSensitivePatterns = options?.allowSensitivePatterns ?? false
  }

  /**
   * 添加验证规则
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.name, rule)
  }

  /**
   * 添加多个验证规则
   */
  addRules(rules: ValidationRule[]): void {
    rules.forEach(rule => this.addRule(rule))
  }

  /**
   * 验证输入对象
   */
  validate(input: Record<string, unknown>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const sanitized: Record<string, unknown> = {}

    // 验证每个规则
    for (const [name, rule] of this.rules) {
      const value = input[name]

      // 检查必需字段
      if (value === undefined || value === null) {
        if (rule.required) {
          errors.push(`缺少必需参数: ${name}`)
        }
        continue
      }

      // 根据类型验证
      const typeResult = this.validateType(name, value, rule)
      errors.push(...typeResult.errors)
      warnings.push(...typeResult.warnings)

      if (typeResult.valid && typeResult.sanitizedValue !== undefined) {
        sanitized[name] = typeResult.sanitizedValue
      }
    }

    // 检查未知字段
    for (const key of Object.keys(input)) {
      if (!this.rules.has(key)) {
        warnings.push(`未知参数将被忽略: ${key}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: sanitized,
    }
  }

  /**
   * 验证单个值
   */
  validateValue(name: string, value: unknown, rule: ValidationRule): ValidationResult {
    return this.validateType(name, value, rule)
  }

  /**
   * 验证类型
   */
  private validateType(
    name: string,
    value: unknown,
    rule: ValidationRule
  ): ValidationResult & { sanitizedValue?: unknown } {
    const errors: string[] = []
    const warnings: string[] = []

    switch (rule.type) {
      case 'string':
        return this.validateString(name, value as string, rule)
      case 'number':
        return this.validateNumber(name, value, rule)
      case 'boolean':
        return this.validateBoolean(name, value, rule)
      case 'enum':
        return this.validateEnum(name, value as string, rule)
      default:
        errors.push(`未知类型: ${rule.type}`)
        return { valid: false, errors, warnings }
    }
  }

  /**
   * 验证字符串
   */
  private validateString(
    name: string,
    value: string,
    rule: ValidationRule
  ): ValidationResult & { sanitizedValue?: string } {
    const errors: string[] = []
    const warnings: string[] = []

    if (typeof value !== 'string') {
      errors.push(`参数 ${name} 必须是字符串`)
      return { valid: false, errors, warnings }
    }

    // 长度检查
    const minLen = rule.minLength ?? 0
    const maxLen = Math.min(rule.maxLength ?? this.maxStringLength, this.maxStringLength)

    if (value.length < minLen) {
      errors.push(`参数 ${name} 长度不能小于 ${minLen}`)
    }
    if (value.length > maxLen) {
      errors.push(`参数 ${name} 长度不能超过 ${maxLen}`)
    }

    // 危险字符检查
    for (const { pattern, message } of DANGEROUS_PATTERNS) {
      if (pattern.test(value)) {
        errors.push(`参数 ${name}: ${message}`)
      }
    }

    // 敏感信息检查
    if (!this.allowSensitivePatterns) {
      for (const { pattern, message } of SENSITIVE_PATTERNS) {
        if (pattern.test(value)) {
          warnings.push(`参数 ${name}: ${message}`)
        }
      }
    }

    // 正则模式检查
    if (rule.pattern) {
      const regex = new RegExp(rule.pattern)
      if (!regex.test(value)) {
        errors.push(`参数 ${name} 格式不正确`)
      }
    }

    // 自定义验证
    if (rule.validate) {
      const result = rule.validate(value)
      if (result !== true) {
        errors.push(typeof result === 'string' ? result : `参数 ${name} 验证失败`)
      }
    }

    // 清理值：去除首尾空白
    const sanitized = value.trim()

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: sanitized,
    }
  }

  /**
   * 验证数字
   */
  private validateNumber(
    name: string,
    value: unknown,
    rule: ValidationRule
  ): ValidationResult & { sanitizedValue?: number } {
    const errors: string[] = []
    const warnings: string[] = []

    // 尝试转换为数字
    let num: number
    if (typeof value === 'number') {
      num = value
    } else if (typeof value === 'string') {
      num = parseFloat(value)
      if (isNaN(num)) {
        errors.push(`参数 ${name} 不是有效的数字`)
        return { valid: false, errors, warnings }
      }
    } else {
      errors.push(`参数 ${name} 必须是数字`)
      return { valid: false, errors, warnings }
    }

    // 范围检查
    if (rule.min !== undefined && num < rule.min) {
      errors.push(`参数 ${name} 不能小于 ${rule.min}`)
    }
    if (rule.max !== undefined && num > rule.max) {
      errors.push(`参数 ${name} 不能大于 ${rule.max}`)
    }

    // 自定义验证
    if (rule.validate) {
      const result = rule.validate(num)
      if (result !== true) {
        errors.push(typeof result === 'string' ? result : `参数 ${name} 验证失败`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: num,
    }
  }

  /**
   * 验证布尔值
   */
  private validateBoolean(
    name: string,
    value: unknown,
    _rule: ValidationRule
  ): ValidationResult & { sanitizedValue?: boolean } {
    const errors: string[] = []
    const warnings: string[] = []

    let bool: boolean
    if (typeof value === 'boolean') {
      bool = value
    } else if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        bool = true
      } else if (lower === 'false' || lower === '0' || lower === 'no') {
        bool = false
      } else {
        errors.push(`参数 ${name} 不是有效的布尔值`)
        return { valid: false, errors, warnings }
      }
    } else if (typeof value === 'number') {
      bool = value !== 0
    } else {
      errors.push(`参数 ${name} 必须是布尔值`)
      return { valid: false, errors, warnings }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: bool,
    }
  }

  /**
   * 验证枚举值
   */
  private validateEnum(
    name: string,
    value: string,
    rule: ValidationRule
  ): ValidationResult & { sanitizedValue?: string } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!rule.enumValues || rule.enumValues.length === 0) {
      errors.push(`枚举参数 ${name} 没有定义允许的值`)
      return { valid: false, errors, warnings }
    }

    if (typeof value !== 'string') {
      errors.push(`参数 ${name} 必须是字符串`)
      return { valid: false, errors, warnings }
    }

    if (!rule.enumValues.includes(value)) {
      errors.push(`参数 ${name} 必须是以下值之一: ${rule.enumValues.join(', ')}`)
      return { valid: false, errors, warnings }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: value,
    }
  }

  /**
   * 快速验证字符串是否安全
   */
  static isSafeString(value: string): boolean {
    for (const { pattern } of DANGEROUS_PATTERNS) {
      if (pattern.test(value)) {
        return false
      }
    }
    return true
  }

  /**
   * 清理字符串（移除危险字符）
   */
  static sanitizeString(value: string): string {
    let result = value
    for (const { pattern } of DANGEROUS_PATTERNS) {
      result = result.replace(pattern, '')
    }
    return result.trim()
  }
}

/**
 * 创建输入验证器
 */
export function createInputValidator(options?: {
  maxStringLength?: number
  allowSensitivePatterns?: boolean
}): InputValidator {
  return new InputValidator(options)
}
