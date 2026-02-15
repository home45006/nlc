/**
 * 领域处理器模块
 *
 * 提供基础的领域处理器抽象类和工具函数
 */

import type {
  DomainHandler,
  DomainContext,
  DomainResult,
  DomainRouting,
  Command,
} from './types.js'
import type { DomainType } from '../types/domain.js'

/**
 * 基础领域处理器抽象类
 *
 * 提供通用的处理流程和错误处理
 */
export abstract class BaseDomainHandler implements DomainHandler {
  abstract readonly domain: DomainType

  abstract handle(routing: DomainRouting, context: DomainContext): Promise<DomainResult>

  /**
   * 创建成功的领域处理结果
   */
  protected createResult(
    intent: string,
    slots: Record<string, unknown>,
    commands: ReadonlyArray<Command>,
    options?: {
      ttsText?: string
      shouldContinue?: boolean
      confidence?: number
    }
  ): DomainResult {
    return {
      intent,
      slots,
      commands,
      ttsText: options?.ttsText,
      shouldContinue: options?.shouldContinue ?? true,
      confidence: options?.confidence ?? 1.0,
    }
  }

  /**
   * 创建空结果（无指令需要执行）
   */
  protected createEmptyResult(reason: string): DomainResult {
    return {
      intent: 'none',
      slots: {},
      commands: [],
      ttsText: reason,
      shouldContinue: false,
      confidence: 0,
    }
  }

  /**
   * 创建单个指令的辅助方法
   */
  protected createCommand(
    type: string,
    params: Record<string, unknown>,
    priority?: number
  ): Command {
    return {
      type,
      params,
      domain: this.domain,
      priority: priority ?? 0,
    }
  }
}

/**
 * 领域处理器工厂函数类型
 */
export type DomainHandlerFactory = () => DomainHandler

/**
 * 领域处理器注册表
 */
export class DomainHandlerRegistry {
  private handlers: Map<DomainType, DomainHandler> = new Map()
  private factories: Map<DomainType, DomainHandlerFactory> = new Map()

  /**
   * 注册处理器实例
   */
  register(handler: DomainHandler): void {
    this.handlers.set(handler.domain, handler)
  }

  /**
   * 注册处理器工厂（延迟创建）
   */
  registerFactory(domain: DomainType, factory: DomainHandlerFactory): void {
    this.factories.set(domain, factory)
  }

  /**
   * 获取处理器
   */
  get(domain: DomainType): DomainHandler | undefined {
    // 优先返回已创建的实例
    if (this.handlers.has(domain)) {
      return this.handlers.get(domain)
    }

    // 使用工厂创建
    const factory = this.factories.get(domain)
    if (factory) {
      const handler = factory()
      this.handlers.set(domain, handler)
      return handler
    }

    return undefined
  }

  /**
   * 检查是否已注册
   */
  has(domain: DomainType): boolean {
    return this.handlers.has(domain) || this.factories.has(domain)
  }

  /**
   * 获取所有已注册的领域
   */
  getRegisteredDomains(): DomainType[] {
    const domains = new Set<DomainType>([
      ...this.handlers.keys(),
      ...this.factories.keys(),
    ])
    return Array.from(domains)
  }
}
