import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import staticPlugin from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerApiRoutes } from './routes/api.js'
import { registerWebSocketRoutes } from './routes/ws.js'
import { DialogManager } from '../dialog/dialog-manager.js'
import { GeminiProvider } from '../llm/providers/gemini.js'
import { ZhipuProvider } from '../llm/providers/zhipu.js'
import { config } from '../config.js'
import type { LLMProvider } from '../types/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface AppContext {
  dialogManager: DialogManager
  currentProvider: LLMProvider
  currentModel: 'gemini' | 'glm'
}

function createProvider(model: 'gemini' | 'glm'): LLMProvider {
  if (model === 'gemini') {
    return new GeminiProvider(config.geminiApiKey)
  }
  return new ZhipuProvider(config.zhipuApiKey)
}

export async function createServer(options: { port?: number; host?: string } = {}) {
  const { port = 3000, host = '0.0.0.0' } = options

  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined,
    },
  })

  // 注册插件
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576,
      clientTracking: true,
    },
  })

  // 创建应用上下文（单用户模式）
  const defaultModel = config.defaultModel === 'gemini' ? 'gemini' : 'glm'
  const currentProvider = createProvider(defaultModel)
  const appContext: AppContext = {
    dialogManager: new DialogManager(currentProvider),
    currentProvider,
    currentModel: defaultModel,
  }

  // 注册 API 路由
  await registerApiRoutes(fastify, appContext)

  // 注册 WebSocket 路由
  await registerWebSocketRoutes(fastify, appContext)

  // 静态文件服务（前端构建产物）
  const webDistPath = path.resolve(__dirname, '../../../web/dist')
  await fastify.register(staticPlugin, {
    root: webDistPath,
    prefix: '/',
    decorateReply: false,
  })

  // SPA 回退路由 - 所有未匹配的路由返回 index.html
  fastify.setNotFoundHandler(async (request, reply) => {
    // 排除 API 路由和 WebSocket
    if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
      reply.code(404).send({ error: 'Not Found' })
      return
    }
    // 对于其他路由，返回 index.html (SPA)
    try {
      return reply.sendFile('index.html')
    } catch {
      reply.code(404).send({ error: 'Frontend not built. Run "npm run web:build" first.' })
    }
  })

  return {
    fastify,
    start: async () => {
      await fastify.listen({ port, host })
      fastify.log.info(`Server listening on http://${host}:${port}`)
      return fastify
    },
    stop: async () => {
      await fastify.close()
    },
  }
}

// 直接运行时启动服务器
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer()
    .then(server => server.start())
    .catch(err => {
      console.error('Failed to start server:', err)
      process.exit(1)
    })
}
