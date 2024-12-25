import type { TRPCError } from '@trpc/server'

import type { RootRouter } from './router'
import { createLogger } from '@regioni/lib-logger'
import { WebSocketServerProxy } from '@regioni/lib-ws'
import { createHTTPServer } from '@trpc/server/adapters/standalone'

import { applyWSSHandler } from '@trpc/server/adapters/ws'
import { createContext } from './context'
import { router } from './router'

export * from '../modules'

const logger = createLogger({
  defaultMeta: {
    service: 'server',
    version: '1.0.0',
    label: 'root',
  },
})

export const app = createHTTPServer({
  router,
  createContext,
  batching: { enabled: true },

  onError({ error }: { error: TRPCError }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      logger.error(error)
    }
  },
})

applyWSSHandler<RootRouter>({
  wss: new WebSocketServerProxy(app),

  router,
  createContext,
  batching: { enabled: true },

  onError({ error }: { error: TRPCError }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      logger.error(error)
    }
  },
})
