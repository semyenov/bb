// import { createAjv } from '@regioni/lib/ajv'
import { createAjv } from '@regioni/lib-ajv'
import { bullmq } from '@regioni/lib-bullmq'
import { createRedisStore } from '@regioni/lib-redis'

// import { createMongoDBStore } from '@regioni/lib/mongodb'

import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone'
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws'

export type Context = Awaited<ReturnType<typeof createContext>>
export type CreateContextOptions =
  | CreateHTTPContextOptions
  | CreateWSSContextFnOptions

export async function createContext() {
  const ajv = await createAjv()
  const redis = await createRedisStore({
    url: 'redis://redis:6379',
  })

  return {
    ajv,
    redis,
    bullmq,
  }
}
