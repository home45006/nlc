/**
 * 核心类型定义 - 新架构基础类型
 *
 * 大模型作为中枢控制器，只负责：
 * 1. 落域识别 - 判断用户输入属于哪个领域
 * 2. 多意图拆分 - 一语多意图的 Query 改写
 * 3. Query 改写 - 使后续小模型能准确处理
 */

import type { DomainType } from '../types/domain.js'
import type { VehicleState } from '../types/vehicle.js'
import type { ChatMessage } from '../types/llm.js'
import type { StateChange } from '../types/dialog.js'

// ============== 落域路由相关 ==============

/**
 * 单个领域的路由结果
 */
export interface DomainRouting {
  /** 识别出的领域 */
  readonly domain: DomainType
  /** 改写后的 Query（包含上下文信息，便于小模型理解） */
  readonly rewrittenQuery: string
  /** 原始用户输入 */
  readonly originalQuery: string
  /** 落域置信度 (0-1) */
  readonly confidence: number
  /** 上下文信息 */
  readonly context?: RoutingContextInfo
}

/**
 * 路由上下文信息
 */
export interface RoutingContextInfo {
  /** 上一个交互的领域 */
  readonly previousDomain?: DomainType
  /** 相关实体（用于跨领域继承） */
  readonly relatedEntities?: Record<string, unknown>
  /** 是否继承自上一轮对话 */
  readonly isInherited?: boolean
}

/**
 * 多意图路由结果
 */
export interface MultiIntentRouting {
  /** 路由列表（可能包含多个领域） */
  readonly routings: ReadonlyArray<DomainRouting>
  /** 是否需要顺序执行 */
  readonly isSequential: boolean
  /** 整体置信度 */
  readonly overallConfidence: number
}

/**
 * 路由上下文（传递给中枢控制器）
 */
export interface RoutingContext {
  /** 当前车辆状态 */
  readonly vehicleState: VehicleState
  /** 对话历史 */
  readonly dialogHistory: ReadonlyArray<ChatMessage>
}

// ============== 领域处理相关 ==============

/**
 * 领域处理上下文（传递给 DomainHandler）
 */
export interface DomainContext {
  /** 当前车辆状态 */
  readonly vehicleState: VehicleState
  /** 对话历史 */
  readonly dialogHistory: ReadonlyArray<ChatMessage>
  /** 上一个处理的领域 */
  readonly previousDomain?: DomainType
  /** 路由上下文信息 */
  readonly routingContext?: RoutingContextInfo
}

/**
 * 领域处理结果
 */
export interface DomainResult {
  /** 识别出的意图 */
  readonly intent: string
  /** 提取的槽位/实体 */
  readonly slots: Record<string, unknown>
  /** 要执行的指令列表 */
  readonly commands: ReadonlyArray<Command>
  /** TTS 回复文本（可选） */
  readonly ttsText?: string
  /** 是否需要继续处理下一个路由 */
  readonly shouldContinue?: boolean
  /** 置信度 */
  readonly confidence: number
}

// ============== 指令相关 ==============

/**
 * 可执行的指令
 */
export interface Command {
  /** 指令类型（对应 functionName） */
  readonly type: string
  /** 指令参数 */
  readonly params: Record<string, unknown>
  /** 指令来源领域 */
  readonly domain: DomainType
  /** 指令优先级（用于排序执行） */
  readonly priority?: number
}

// ============== 意图解析相关 ==============

/**
 * 意图解析结果（小模型输出）
 */
export interface IntentResult {
  /** 意图类型 */
  readonly intent: string
  /** 槽位/实体 */
  readonly slots: Record<string, unknown>
  /** 置信度 */
  readonly confidence: number
}

// ============== 执行结果相关 ==============

/**
 * 指令执行结果
 */
export interface CommandExecutionResult {
  /** 是否成功 */
  readonly success: boolean
  /** 状态变更列表 */
  readonly stateChanges: ReadonlyArray<StateChange>
  /** 错误信息（如果失败） */
  readonly error?: string
  /** TTS 回复 */
  readonly ttsText?: string
}

// ============== 智能问答领域相关 ==============

/**
 * 问答子类型
 */
export const ChatSubType = {
  /** 自由聊天 */
  FREE_CHAT: 'free_chat',
  /** 车辆问答 */
  VEHICLE_QA: 'vehicle_qa',
  /** 多轮对话 */
  MULTI_TURN: 'multi_turn',
} as const

export type ChatSubTypeType = (typeof ChatSubType)[keyof typeof ChatSubType]

/**
 * 问答领域额外信息
 */
export interface ChatDomainInfo {
  /** 问答子类型 */
  readonly subType: ChatSubTypeType
  /** 是否需要上下文 */
  readonly needsContext: boolean
  /** 相关主题 */
  readonly topic?: string
}

// ============== 领域处理器接口 ==============

/**
 * 领域处理器接口
 */
export interface DomainHandler {
  /** 处理器所属领域 */
  readonly domain: DomainType

  /** 处理改写后的 Query，返回结构化结果 */
  handle(routing: DomainRouting, context: DomainContext): Promise<DomainResult>
}

// ============== 领域模型接口 ==============

/**
 * 领域模型接口（小模型）
 */
export interface DomainModel {
  /** 模型名称 */
  readonly name: string

  /** 调用小模型进行意图理解 */
  parseIntent(query: string, context: DomainContext): Promise<IntentResult>
}

// ============== 中枢控制器接口 ==============

/**
 * 中枢控制器接口
 */
export interface CentralController {
  /** 落域识别 + 多意图拆分 + Query 改写 */
  route(userInput: string, context: RoutingContext): Promise<MultiIntentRouting>
}

// ============== 领域路由器接口 ==============

/**
 * 领域路由器接口
 */
export interface DomainRouter {
  /** 注册领域处理器 */
  registerHandler(handler: DomainHandler): void

  /** 根据路由结果分发到对应处理器 */
  dispatch(routing: DomainRouting, context: DomainContext): Promise<DomainResult>

  /** 批量处理多个路由 */
  dispatchAll(routings: ReadonlyArray<DomainRouting>, context: DomainContext): Promise<ReadonlyArray<DomainResult>>
}
