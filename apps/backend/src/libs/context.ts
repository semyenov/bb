import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone'
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws'

import { createAjv } from '@regioni/lib-ajv'
import { bullmq } from '@regioni/lib-bullmq'
import { createRedisStore } from '@regioni/lib-redis'

export type CreateContextOptions =
  | CreateHTTPContextOptions
  | CreateWSSContextFnOptions

export async function createContext() {
  const ajv = await createAjv()
  const redis = await createRedisStore({
    url: 'redis://localhost:6379',
  })

  return {
    ajv,
    bullmq,
    redis,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
