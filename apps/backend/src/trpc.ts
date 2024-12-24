import type { Context } from './context'

import { createLogger } from '@regioni/lib-logger'
import { transformer } from '@regioni/lib-superjson'
import { initTRPC } from '@trpc/server'

const logger = createLogger({
  defaultMeta: {
    service: 'trpc',
    module: 'root',
  },
})

const t = initTRPC.meta()
  .context<Context>()
  .create({
    transformer,
  })

export const rootRouter = t.router

export const publicProcedure = t.procedure
export const wsProcedure = t.procedure

export const loggerMiddleware = t.middleware(async ({ next }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start

  logger.info(`Request processed in ${duration}ms`)

  // Log input and output
  if (result.ok) {
    logger.info('Success:', result)

    return result
  }

  logger.error('Error:', result.error)

  return result
})
