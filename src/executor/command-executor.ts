import type { StateChange, ToolCall } from '../types/index.js'
import { VehicleStateManager } from './vehicle-state.js'

export class CommandExecutor {
  private readonly stateManager: VehicleStateManager

  constructor(stateManager: VehicleStateManager) {
    this.stateManager = stateManager
  }

  execute(toolCalls: ReadonlyArray<ToolCall>): ReadonlyArray<StateChange> {
    const allChanges: StateChange[] = []

    for (const tc of toolCalls) {
      const params = JSON.parse(tc.function.arguments) as Record<string, unknown>
      const changes = this.stateManager.applyCommand(tc.function.name, params)
      allChanges.push(...changes)
    }

    return allChanges
  }
}
