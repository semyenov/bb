import type { TRPCError } from '@trpc/server'

import { WebSocketServerProxy } from '@regioni/lib-ws'
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { applyWSSHandler } from '@trpc/server/adapters/ws'

import { createContext } from './lib/context'
import { logger } from './lib/logger'
import { router } from './lib/router'

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
