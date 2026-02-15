/**
 * 领域路由器
 *
 * 根据中枢控制器的落域结果，分发到对应的领域处理器
 */

import type {
  DomainRouter,
  DomainHandler,
  DomainRouting,
  DomainContext,
  DomainResult,
} from '../core/types.js'
import { DomainHandlerRegistry } from '../core/domain-handler.js'
import type { DomainType } from '../types/domain.js'
import { Domain } from '../types/domain.js'

/**
 * 领域路由器实现
 */
export class DomainRouterImpl implements DomainRouter {
  private readonly registry: DomainHandlerRegistry

  constructor() {
    this.registry = new DomainHandlerRegistry()
  }

  /**
   * 注册领域处理器
   */
  registerHandler(handler: DomainHandler): void {
    this.registry.register(handler)
    console.log(`[DomainRouter] Registered handler for domain: ${handler.domain}`)
  }

  /**
   * 分发单个路由到对应处理器
   */
  async dispatch(routing: DomainRouting, context: DomainContext): Promise<DomainResult> {
    const handler = this.registry.get(routing.domain)

    if (!handler) {
      console.warn(`[DomainRouter] No handler found for domain: ${routing.domain}`)
      return this.createUnhandledResult(routing)
    }

    try {
      const result = await handler.handle(routing, context)
      return result
    } catch (error) {
      console.error(`[DomainRouter] Handler error for domain ${routing.domain}:`, error)
      return this.createErrorResult(routing, error)
    }
  }

  /**
   * 批量处理多个路由
   */
  async dispatchAll(
    routings: ReadonlyArray<DomainRouting>,
    context: DomainContext
  ): Promise<ReadonlyArray<DomainResult>> {
    // 按优先级排序（根据置信度和顺序）
    const sortedRoutings = [...routings].sort((a, b) => {
      // 优先处理置信度高的
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence
      }
      // 同置信度时，按领域优先级（vehicle > music > navigation > chat）
      return this.getDomainPriority(a.domain) - this.getDomainPriority(b.domain)
    })

    // 顺序处理
    const results: DomainResult[] = []
    let currentContext = context

    for (const routing of sortedRoutings) {
      const result = await this.dispatch(routing, currentContext)

      results.push(result)

      // 如果不需要继续处理，停止
      if (result.shouldContinue === false) {
        break
      }

      // 更新上下文（如果有状态变更）
      currentContext = {
        ...currentContext,
        previousDomain: routing.domain,
      }
    }

    return results
  }

  /**
   * 获取领域优先级
   */
  private getDomainPriority(domain: DomainType): number {
    const priorities: Record<string, number> = {
      [Domain.VEHICLE_CONTROL]: 1,
      [Domain.MUSIC]: 2,
      [Domain.NAVIGATION]: 3,
      [Domain.CHAT]: 4,
    }
    return priorities[domain] ?? 99
  }

  /**
   * 创建未处理结果
   */
  private createUnhandledResult(routing: DomainRouting): DomainResult {
    return {
      intent: 'unhandled',
      slots: {},
      commands: [],
      ttsText: `抱歉，${routing.domain} 领域暂未实现`,
      shouldContinue: false,
      confidence: 0,
    }
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(routing: DomainRouting, error: unknown): DomainResult {
    console.error(`[DomainRouter] Error in ${routing.domain}:`, error)
    return {
      intent: 'error',
      slots: {},
      commands: [],
      ttsText: `处理 ${routing.domain} 领域时发生错误`,
      shouldContinue: false,
      confidence: 0,
    }
  }

  /**
   * 检查是否所有领域都已注册
   */
  isFullyConfigured(): boolean {
    const requiredDomains = [Domain.VEHICLE_CONTROL, Domain.MUSIC, Domain.NAVIGATION, Domain.CHAT]
    return requiredDomains.every(domain => this.registry.has(domain))
  }

  /**
   * 获取已注册的领域列表
   */
  getRegisteredDomains(): DomainType[] {
    return this.registry.getRegisteredDomains()
  }
}

/**
 * 创建路由器实例
 */
export function createDomainRouter(): DomainRouter {
  return new DomainRouterImpl()
}
