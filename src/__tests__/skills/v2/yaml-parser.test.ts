/**
 * YAML Parser 测试
 *
 * 测试覆盖：
 * - 基本类型解析
 * - 嵌套结构
 * - 数组解析
 * - 多行字符串
 * - 边界情况
 */

import { describe, it, expect } from 'vitest'
import { parseSimpleYaml } from '../../../skills/v2/yaml-parser.js'

describe('parseSimpleYaml', () => {
  describe('基本类型', () => {
    it('应该解析字符串值', () => {
      const yaml = `name: 车辆控制
description: 控制车辆功能`
      const result = parseSimpleYaml(yaml)

      expect(result.name).toBe('车辆控制')
      expect(result.description).toBe('控制车辆功能')
    })

    it('应该解析数字值', () => {
      const yaml = `priority: 10
temperature: 24
percentage: 50`
      const result = parseSimpleYaml(yaml)

      expect(result.priority).toBe(10)
      expect(result.temperature).toBe(24)
      expect(result.percentage).toBe(50)
    })

    it('应该解析布尔值', () => {
      const yaml = `enabled: true
disabled: false`
      const result = parseSimpleYaml(yaml)

      expect(result.enabled).toBe(true)
      expect(result.disabled).toBe(false)
    })

    it('应该解析带引号的字符串', () => {
      const yaml = `name: "车辆控制"
version: '1.0.0'`
      const result = parseSimpleYaml(yaml)

      expect(result.name).toBe('车辆控制')
      expect(result.version).toBe('1.0.0')
    })
  })

  describe('数组解析', () => {
    it('应该解析简单数组', () => {
      const yaml = `tags:
  - vehicle
  - control
  - hardware`
      const result = parseSimpleYaml(yaml)

      expect(result.tags).toEqual(['vehicle', 'control', 'hardware'])
    })

    it('应该解析数字数组', () => {
      const yaml = `values:
  - 1
  - 2
  - 3`
      const result = parseSimpleYaml(yaml)

      expect(result.values).toEqual([1, 2, 3])
    })
  })

  describe('嵌套对象', () => {
    it('应该解析对象数组', () => {
      const yaml = `capabilities:
  - name: ac_control
    description: 空调控制
  - name: window_control
    description: 车窗控制`
      const result = parseSimpleYaml(yaml)

      expect(result.capabilities).toHaveLength(2)
      expect(result.capabilities[0]).toEqual({
        name: 'ac_control',
        description: '空调控制',
      })
      expect(result.capabilities[1]).toEqual({
        name: 'window_control',
        description: '车窗控制',
      })
    })

    it('应该解析对象数组', () => {
      const yaml = `capabilities:
  - name: ac_control
    description: 空调控制
  - name: window_control
    description: 车窗控制`
      const result = parseSimpleYaml(yaml)

      expect(result.capabilities).toHaveLength(2)
      expect(result.capabilities[0]).toEqual({
        name: 'ac_control',
        description: '空调控制',
      })
      expect(result.capabilities[1]).toEqual({
        name: 'window_control',
        description: '车窗控制',
      })
    })
  })

  describe('多行字符串', () => {
    it('应该解析块标量 (|)', () => {
      const yaml = `description: |
  这是第一行
  这是第二行`
      const result = parseSimpleYaml(yaml)

      expect(result.description).toContain('这是第一行')
      expect(result.description).toContain('这是第二行')
    })

    // 注意：简化版 YAML 解析器不支持折叠块标量 (>)
    // 该特性需要完整 YAML 解析器支持
  })

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      const result = parseSimpleYaml('')
      expect(result).toEqual({})
    })

    it('应该处理只有空白的字符串', () => {
      const result = parseSimpleYaml('   \n\n   ')
      expect(result).toEqual({})
    })

    it('应该处理注释', () => {
      const yaml = `# 这是注释
name: test
# 另一个注释`
      const result = parseSimpleYaml(yaml)

      expect(result.name).toBe('test')
    })

    it('应该处理空值', () => {
      const yaml = `name:
description: null`
      const result = parseSimpleYaml(yaml)

      // 简化版解析器将空值和 null 都保留为字符串
      expect(result.name).toBe('')
      expect(result.description).toBe('null')
    })

    it('应该处理带冒号的值', () => {
      const yaml = `message: "Hello: World"`
      const result = parseSimpleYaml(yaml)

      expect(result.message).toBe('Hello: World')
    })
  })

  describe('复杂结构', () => {
    it('应该解析复杂的嵌套结构', () => {
      const yaml = `id: vehicle_control
name: 车辆控制
priority: 1
enabled: true
tags:
  - vehicle
  - control
capabilities:
  - name: ac_control
    description: 空调控制
    slots:
      - name: action
        type: enum
        required: true
        enumValues:
          - turn_on
          - turn_off
      - name: temperature
        type: number
        required: false
        min: 16
        max: 32`
      const result = parseSimpleYaml(yaml)

      expect(result.id).toBe('vehicle_control')
      expect(result.name).toBe('车辆控制')
      expect(result.priority).toBe(1)
      expect(result.enabled).toBe(true)
      expect(result.tags).toEqual(['vehicle', 'control'])
      expect(result.capabilities).toHaveLength(1)
      expect(result.capabilities[0].slots).toHaveLength(2)
      expect(result.capabilities[0].slots[0].enumValues).toEqual(['turn_on', 'turn_off'])
    })
  })
})
