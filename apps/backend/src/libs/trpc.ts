import { transformer } from '@regioni/lib-superjson'
import { initTRPC } from '@trpc/server'

import type { Context } from './context'
import type { Meta } from './meta'

import { meta } from './meta'

export const t = initTRPC
  .meta<Meta>()
  .context<Context>()
  .create({
    defaultMeta: meta,
    transformer,
  })

export const publicProcedure = t.procedure
export const wsProcedure = t.procedure
export const rootRouter = t.router