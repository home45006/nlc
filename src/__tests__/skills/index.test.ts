/**
 * Skill 模块入口测试 (V2 架构)
 *
 * 验证 V2 模块导出的正确性
 */

import { describe, it, expect } from 'vitest'
import * as SkillModule from '../../skills/index.js'

describe('Skill Module Exports (V2)', () => {
  describe('核心类型', () => {
    it('应该导出 Skill 类型', () => {
      // 类型导出在运行时不可检查，但可以验证模块加载成功
      expect(SkillModule).toBeDefined()
    })
  })

  describe('V2 文件系统架构', () => {
    it('应该导出 FileBasedSkillRegistry', () => {
      expect(SkillModule.FileBasedSkillRegistry).toBeDefined()
    })

    it('应该导出 SkillLoader', () => {
      expect(SkillModule.SkillLoader).toBeDefined()
    })

    it('应该导出 SkillExecutor', () => {
      expect(SkillModule.SkillExecutor).toBeDefined()
    })

    it('应该导出 FileBasedSkillOrchestrator', () => {
      expect(SkillModule.FileBasedSkillOrchestrator).toBeDefined()
      expect(SkillModule.createFileBasedSkillOrchestrator).toBeDefined()
    })

    it('应该导出全局注册表函数', () => {
      expect(SkillModule.getGlobalFileBasedSkillRegistry).toBeDefined()
      expect(SkillModule.resetGlobalFileBasedSkillRegistry).toBeDefined()
    })

    it('应该导出全局执行器函数', () => {
      expect(SkillModule.getGlobalSkillExecutor).toBeDefined()
      expect(SkillModule.resetGlobalSkillExecutor).toBeDefined()
    })
  })

  describe('兼容性别名', () => {
    it('应该导出 SkillOrchestrator 别名', () => {
      expect(SkillModule.SkillOrchestrator).toBeDefined()
      expect(SkillModule.createSkillOrchestrator).toBeDefined()
    })
  })

  describe('类型守卫', () => {
    it('应该导出 isSkillMetadataYaml', () => {
      expect(SkillModule.isSkillMetadataYaml).toBeDefined()
      expect(typeof SkillModule.isSkillMetadataYaml).toBe('function')
    })

    it('应该导出 isCapabilityDefinition', () => {
      expect(SkillModule.isCapabilityDefinition).toBeDefined()
      expect(typeof SkillModule.isCapabilityDefinition).toBe('function')
    })

    it('应该导出转换函数', () => {
      expect(SkillModule.toCapabilitySlot).toBeDefined()
      expect(SkillModule.toSkillCapability).toBeDefined()
      expect(SkillModule.toSkillInterface).toBeDefined()
    })
  })
})
