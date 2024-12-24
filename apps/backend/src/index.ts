import type { Router } from './router'

import { createLogger } from '@regioni/lib-logger'
import { WebSocketServerProxy } from '@regioni/lib-ws'
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { applyWSSHandler } from '@trpc/server/adapters/ws'

import { createContext } from './context'
import { router } from './router'

export * from './modules'

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

  onError({ error }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      logger.error(error)
    }
  },
})

applyWSSHandler<Router>({
  wss: new WebSocketServerProxy(app),

  router,
  createContext,
  batching: { enabled: true },

  onError({ error }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      logger.error(error)
    }
  },
})

app.listen(4000)
logger.info('Listening on http://localhost:4000')
