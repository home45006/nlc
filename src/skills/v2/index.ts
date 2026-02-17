/**
 * Skill V2 模块导出
 *
 * 文件系统级 Skills 实现，支持渐进式披露
 */

// 类型定义
export type {
  SkillMetadataYaml,
  SkillInstructions,
  CapabilityDefinition,
  SlotDefinition,
  ParsedCapability,
  FileBasedSkillData,
} from './types.js'

// 类型守卫和转换函数
export {
  isSkillMetadataYaml,
  isCapabilityDefinition,
  toCapabilitySlot,
  toSkillCapability,
  toSkillInterface,
} from './types.js'

// 加载器
export {
  SkillLoader,
  FileBasedSkill,
  type SkillLoaderOptions,
} from './skill-loader.js'

// 注册表
export {
  FileBasedSkillRegistry,
  getGlobalFileBasedSkillRegistry,
  resetGlobalFileBasedSkillRegistry,
  type FileBasedSkillRegistryOptions,
} from './file-based-skill-registry.js'

// 执行器
export {
  SkillExecutor,
  getGlobalSkillExecutor,
  resetGlobalSkillExecutor,
  type CapabilityHandler,
  type CapabilityDefinition as ExecutorCapabilityDefinition,
  type SkillExecutorOptions,
  type ExecutionRequest,
} from './skill-executor.js'

// 编排器
export {
  FileBasedSkillOrchestrator,
  createFileBasedSkillOrchestrator,
  type FileBasedOrchestratorOptions,
  type OrchestratorContext,
  type OrchestrationResult,
} from './file-based-orchestrator.js'
