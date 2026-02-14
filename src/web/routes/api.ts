import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../server.js'
import type { VehicleState, ChatMessage } from '../../types/index.js'
import { GeminiProvider } from '../../llm/providers/gemini.js'
import { ZhipuProvider } from '../../llm/providers/zhipu.js'

interface DialogRequest {
  Body: {
    message: string
  }
}

interface SwitchModelRequest {
  Body: {
    model: 'gemini' | 'glm'
  }
}

export async function registerApiRoutes(fastify: FastifyInstance, ctx: AppContext) {
  // 获取车辆当前状态
  fastify.get<{ Reply: { success: boolean; data: VehicleState } }>('/api/state', async (_request, reply) => {
    const state = ctx.dialogManager.stateManager.getState()
    return reply.send({ success: true, data: state })
  })

  // 重置车辆状态
  fastify.post<{ Reply: { success: boolean; message: string } }>('/api/state/reset', async (_request, reply) => {
    ctx.dialogManager.resetState()
    return reply.send({ success: true, message: 'State reset successfully' })
  })

  // 发送对话消息
  fastify.post<DialogRequest>('/api/dialog', async (request, reply) => {
    const { message } = request.body ?? {}

    if (!message || typeof message !== 'string') {
      return reply.code(400).send({ success: false, error: 'Message is required' })
    }

    try {
      const result = await ctx.dialogManager.handleInput(message)
      return reply.send({
        success: true,
        data: {
          ttsText: result.output.ttsText,
          stateChanges: result.stateChanges,
          vehicleState: ctx.dialogManager.stateManager.getState(),
          meta: result.output.meta,
        },
      })
    } catch (error) {
      fastify.log.error(error, 'Dialog processing failed')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      })
    }
  })

  // 获取对话历史
  fastify.get<{ Reply: { success: boolean; data: ChatMessage[] } }>('/api/history', async (_request, reply) => {
    const history = ctx.dialogManager.getHistory()
    return reply.send({ success: true, data: [...history] })
  })

  // 清除对话历史
  fastify.delete<{ Reply: { success: boolean; message: string } }>('/api/history', async (_request, reply) => {
    ctx.dialogManager.clearHistory()
    return reply.send({ success: true, message: 'History cleared successfully' })
  })

  // 切换模型
  fastify.post<SwitchModelRequest>('/api/model', async (request, reply) => {
    const { model } = request.body ?? {}

    if (!model || !['gemini', 'glm'].includes(model)) {
      return reply.code(400).send({ success: false, error: 'Invalid model. Use "gemini" or "glm"' })
    }

    try {
      if (model === 'gemini') {
        ctx.currentProvider = new GeminiProvider(process.env.GEMINI_API_KEY ?? '')
      } else {
        ctx.currentProvider = new ZhipuProvider(process.env.ZHIPU_API_KEY ?? '')
      }

      ctx.currentModel = model
      ctx.dialogManager.switchProvider(ctx.currentProvider)

      return reply.send({ success: true, data: { model } })
    } catch (error) {
      fastify.log.error(error, 'Model switch failed')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch model',
      })
    }
  })

  // 获取当前模型
  fastify.get<{ Reply: { success: boolean; data: { model: string } } }>('/api/model', async (_request, reply) => {
    return reply.send({ success: true, data: { model: ctx.currentModel } })
  })

  // 健康检查
  fastify.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() })
  })
}
