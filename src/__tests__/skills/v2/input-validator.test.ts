import { describe, it, expect } from 'vitest'
import { InputValidator, createInputValidator } from '../../../skills/v2/input-validator.js'

describe('InputValidator', () => {
  describe('validate', () => {
    it('应该验证必需字段', () => {
      const validator = createInputValidator()
      validator.addRule({
        name: 'city',
        type: 'string',
        required: true,
      })

      const result = validator.validate({})

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('缺少必需参数: city')
    })

    it('应该验证字符串长度', () => {
      const validator = createInputValidator({ maxStringLength: 10 })
      validator.addRule({
        name: 'message',
        type: 'string',
        maxLength: 5,
      })

      const result = validator.validate({ message: 'too long message' })

      expect(result.valid).toBe(false)
    })

    it('应该验证数字范围', () => {
      const validator = createInputValidator()
      validator.addRule({
        name: 'temperature',
        type: 'number',
        min: 16,
        max: 30,
      })

      const result = validator.validate({ temperature: 35 })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('不能大于')
    })

    it('应该验证枚举值', () => {
      const validator = createInputValidator()
      validator.addRule({
        name: 'mode',
        type: 'enum',
        enumValues: ['cool', 'heat', 'auto'],
      })

      const result = validator.validate({ mode: 'invalid' })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('必须是以下值之一')
    })

    it('应该检测危险字符', () => {
      const validator = createInputValidator()
      validator.addRule({
        name: 'input',
        type: 'string',
      })

      const result = validator.validate({ input: 'hello; rm -rf /' })

      expect(result.valid).toBe(false)
    })

    it('应该清理有效输入', () => {
      const validator = createInputValidator()
      validator.addRule({
        name: 'city',
        type: 'string',
      })

      const result = validator.validate({ city: '  Beijing  ' })

      expect(result.valid).toBe(true)
      expect((result.sanitizedValue as Record<string, unknown>).city).toBe('Beijing')
    })
  })

  describe('validateValue', () => {
    it('应该验证单个值', () => {
      const validator = createInputValidator()
      const rule = {
        name: 'temperature',
        type: 'number' as const,
        min: 16,
        max: 30,
      }

      const validResult = validator.validateValue('temperature', 24, rule)
      expect(validResult.valid).toBe(true)

      const invalidResult = validator.validateValue('temperature', 35, rule)
      expect(invalidResult.valid).toBe(false)
    })
  })

  describe('静态方法', () => {
    it('isSafeString 应该检测危险字符', () => {
      expect(InputValidator.isSafeString('hello world')).toBe(true)
      expect(InputValidator.isSafeString('hello;world')).toBe(false)
      expect(InputValidator.isSafeString('$(command)')).toBe(false)
      expect(InputValidator.isSafeString('../../../etc/passwd')).toBe(false)
    })

    it('sanitizeString 应该移除危险字符', () => {
      expect(InputValidator.sanitizeString('hello world')).toBe('hello world')
      expect(InputValidator.sanitizeString('hello;world')).toBe('helloworld')
    })
  })
})
