import type { DomainType } from './domain.js'

export interface DialogOutput {
  readonly domain: DomainType
  readonly intent: string
  readonly slots: Record<string, unknown>
  readonly confidence: number
  readonly ttsText: string
  readonly hasCommand: boolean
  readonly meta: {
    readonly model: string
    readonly latencyMs: number
    readonly tokens: { readonly prompt: number; readonly completion: number }
  }
}

export interface StateChange {
  readonly field: string
  readonly from: string
  readonly to: string
}
