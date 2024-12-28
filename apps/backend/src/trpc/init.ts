import type { TrpcCliMeta } from 'trpc-cli'
import type { Context } from './context'

import { transformer } from '@regioni/lib-superjson'
import { initTRPC } from '@trpc/server'

export const t = initTRPC
  .meta<TrpcCliMeta>()
  .context<Context>()
  .create({
    transformer,
  })

export const rootRouter = t.router

export const publicProcedure = t.procedure
export const wsProcedure = t.procedure
