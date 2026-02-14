import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { AppContext } from '../server.js'
import type { RawData } from 'ws'

interface WebSocketMessage {
  type: 'dialog' | 'ping'
  payload?: unknown
}

interface DialogPayload {
  message: string
}

export async function registerWebSocketRoutes(fastify: FastifyInstance, ctx: AppContext) {
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection: WebSocket, _req) => {
      fastify.log.info('WebSocket client connected')

      // 发送初始状态
      sendInitialState(connection)

      connection.on('message', async (rawMessage: RawData) => {
        try {
          const message: WebSocketMessage = JSON.parse(rawMessage.toString())

          switch (message.type) {
            case 'dialog':
              await handleDialogMessage(connection, message.payload as DialogPayload, ctx, fastify)
              break
            case 'ping':
              connection.send(JSON.stringify({ type: 'pong' }))
              break
            default:
              connection.send(JSON.stringify({
                type: 'error',
                payload: { message: `Unknown message type: ${(message as { type: string }).type}` },
              }))
          }
        } catch (error: unknown) {
          fastify.log.error(error, 'WebSocket message handling failed')
          connection.send(JSON.stringify({
            type: 'error',
            payload: { message: error instanceof Error ? error.message : 'Internal error' },
          }))
        }
      })

      connection.on('close', () => {
        fastify.log.info('WebSocket client disconnected')
      })

      connection.on('error', (error: unknown) => {
        fastify.log.error(error, 'WebSocket error')
      })
    })
  })

  function sendInitialState(connection: WebSocket) {
    const state = ctx.dialogManager.stateManager.getState()
    const history = ctx.dialogManager.getHistory()

    connection.send(JSON.stringify({
      type: 'init',
      payload: {
        vehicleState: state,
        history,
        model: ctx.currentModel,
      },
    }))
  }

  async function handleDialogMessage(
    connection: WebSocket,
    payload: DialogPayload,
    ctx: AppContext,
    fastify: FastifyInstance,
  ) {
    const { message } = payload

    if (!message || typeof message !== 'string') {
      connection.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Message is required' },
      }))
      return
    }

    // 发送处理中状态
    connection.send(JSON.stringify({
      type: 'processing',
      payload: { message: 'Processing your request...' },
    }))

    try {
      const result = await ctx.dialogManager.handleInput(message)

      // 发送对话响应
      connection.send(JSON.stringify({
        type: 'dialog',
        payload: {
          ttsText: result.output.ttsText,
          stateChanges: result.stateChanges,
          meta: result.output.meta,
        },
      }))

      // 发送更新后的车辆状态
      connection.send(JSON.stringify({
        type: 'state',
        payload: {
          vehicleState: ctx.dialogManager.stateManager.getState(),
        },
      }))
    } catch (error) {
      fastify.log.error(error, 'Dialog processing failed')
      connection.send(JSON.stringify({
        type: 'error',
        payload: {
          message: error instanceof Error ? error.message : 'Dialog processing failed',
        },
      }))
    }
  }
}
