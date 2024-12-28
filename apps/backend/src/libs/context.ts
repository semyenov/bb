import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone'
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws'

import { createAjv } from '@regioni/lib-ajv'
import { bullmq } from '@regioni/lib-bullmq'
import { createCRUD } from '@regioni/lib-redis'
import { createClient as createRedisClient } from 'redis'

import type { Meta, User } from '../modules'

export type CreateContextOptions =
  | CreateHTTPContextOptions
  | CreateWSSContextFnOptions

export async function createContext() {
  const ajv = await createAjv()
  const connection = createRedisClient({
    url: 'redis://localhost:6379',
  })

  await connection.connect()

  return {
    ajv,
    bullmq,
    redis: {
      data: createCRUD({ connection, prefix: 'data' }),
      disconnect: connection.disconnect,
      meta: createCRUD<Meta>({ connection, prefix: 'meta' }),
      schemas: createCRUD({ connection, prefix: 'schemas' }),
      users: createCRUD<User>({ connection, prefix: 'users' }),
    },
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
