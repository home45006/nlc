/**
 * 所有领域模块导出
 */

// 车控领域
export { VehicleControlHandler, createVehicleControlHandler, VehicleDomainModel } from './vehicle/index.js'

// 音乐领域
export { MusicHandler, createMusicHandler, MusicDomainModel } from './music/index.js'

// 导航领域
export { NavigationHandler, createNavigationHandler, NavigationDomainModel } from './navigation/index.js'

// 智能问答领域
export { ChatHandler, createChatHandler, ChatDomainModel, ContextManager } from './chat/index.js'

// 导出创建所有处理器的工厂函数
import type { DomainHandler } from '../core/types.js'
import type { LLMProvider } from '../types/llm.js'
import { createVehicleControlHandler } from './vehicle/index.js'
import { createMusicHandler } from './music/index.js'
import { createNavigationHandler } from './navigation/index.js'
import { createChatHandler } from './chat/index.js'

/**
 * 创建所有领域处理器
 */
export function createAllHandlers(provider: LLMProvider): DomainHandler[] {
  return [
    createVehicleControlHandler(provider),
    createMusicHandler(provider),
    createNavigationHandler(provider),
    createChatHandler(provider),
  ]
}
