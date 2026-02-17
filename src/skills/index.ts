/**
 * Skill 模块入口
 *
 * 导出 Skill 系统的所有核心组件（V2 架构）
 *
 * V2 架构特点：
 * - 文件系统级 Skills（skill.yaml + SKILL.md）
 * - 渐进式披露（三层加载策略）
 * - 动态能力注册
 */

// ============================================================
// V2 核心类型
// ============================================================
export type {
  Skill,
  SkillCapability,
  SkillInput,
  SkillContext,
  SkillResult,
  SkillMetadata,
  CapabilitySlot,
  SkillFactory,
  SkillOptions,
  RecognizedIntent,
  IntentRecognitionResult,
} from './types.js'

// ============================================================
// V2 文件系统架构
// ============================================================

// YAML 类型定义
export type {
  SkillMetadataYaml,
  SkillInstructions,
  CapabilityDefinition,
  SlotDefinition,
  ParsedCapability,
  FileBasedSkillData,
} from './v2/types.js'

// 类型守卫和转换函数
export {
  isSkillMetadataYaml,
  isCapabilityDefinition,
  toCapabilitySlot,
  toSkillCapability,
  toSkillInterface,
} from './v2/types.js'

// Skill 加载器
export {
  SkillLoader,
  FileBasedSkill,
  type SkillLoaderOptions,
} from './v2/skill-loader.js'

// 文件系统注册表
export {
  FileBasedSkillRegistry,
  getGlobalFileBasedSkillRegistry,
  resetGlobalFileBasedSkillRegistry,
  type FileBasedSkillRegistryOptions,
} from './v2/file-based-skill-registry.js'

// 能力执行器
export {
  SkillExecutor,
  getGlobalSkillExecutor,
  resetGlobalSkillExecutor,
  type CapabilityHandler,
  type SkillExecutorOptions,
  type ExecutionRequest,
} from './v2/skill-executor.js'

// 编排器（主要入口）
export {
  FileBasedSkillOrchestrator,
  createFileBasedSkillOrchestrator,
  type FileBasedOrchestratorOptions,
  type OrchestratorContext,
  type OrchestrationResult,
} from './v2/file-based-orchestrator.js'

// ============================================================
// 兼容性别名（向后兼容）
// ============================================================

// 为旧代码提供兼容性别名
export { FileBasedSkillOrchestrator as SkillOrchestrator } from './v2/file-based-orchestrator.js'
export { createFileBasedSkillOrchestrator as createSkillOrchestrator } from './v2/file-based-orchestrator.js'

// 导出 OrchestratorContext 和 OrchestrationResult 的类型别名
export type {
  OrchestratorContext as SkillOrchestratorContext,
  OrchestrationResult as SkillOrchestrationResult,
} from './v2/file-based-orchestrator.js'
