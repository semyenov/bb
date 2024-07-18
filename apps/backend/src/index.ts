import { WebSocketServerProxy } from '@regioni/lib-ws'
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { applyWSSHandler } from '@trpc/server/adapters/ws'
import consola from 'consola'

import { createContext } from './context'
import { type Router, router } from './router'

// import type { Router } from './router'

export * from './router'

const logger = consola.withTag('server')
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
logger.info('Listening on 4000')
