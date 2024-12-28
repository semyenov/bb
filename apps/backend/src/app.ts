import type { TRPCError } from '@trpc/server'

import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { applyWSSHandler } from '@trpc/server/adapters/ws'

import { createLogger } from '@/libs/logger'
import { WebSocketServerProxy } from '@/libs/ws'
import { createContext, router } from '@/trpc'

const logger = createLogger({
  defaultMeta: {
    app: 'regioni',
    label: 'server',
    service: 'root',
  },
})

function errorHandler({ error }: { error: TRPCError }) {
  if (error.code === 'INTERNAL_SERVER_ERROR') {
    logger.error(error)
  }
}

export const app = createHTTPServer({
  batching: { enabled: true },
  createContext,
  onError: errorHandler,
  router,
})

applyWSSHandler({
  batching: { enabled: true },
  createContext,
  onError: errorHandler,
  router,
  wss: new WebSocketServerProxy(app),
})

app.listen(3000)
