import type { RedisJSON } from 'libs/redis/src/types'

import { createLogger } from '@regioni/lib-logger'
import { parsePath } from '@regioni/lib-pointers'
import { wrap } from '@typeschema/typebox'
import { publicProcedure, rootRouter } from '../../trpc'
import { GetItemInputSchema, PostItemInputSchema } from './schema'

const logger = createLogger({
  defaultMeta: {
    service: 'backend',
    version: '0.0.1',
    label: 'data',
  },
})

export const dataRouter = rootRouter({
  getAll: publicProcedure.query(({ ctx: { redis } }) => {
    return redis.data.getAll()
  }),

  getItem: publicProcedure
    .input(wrap(GetItemInputSchema))
    .query(({
      input: { id },
      ctx: { redis },
    }) => {
      return redis.data.findOne(
        id,
      )
    }),

  postItem: publicProcedure
    .input(wrap(PostItemInputSchema))
    .mutation(({
      input: { id, path, data },
      ctx: { redis, ajv },
    }) => {
      const {
        namespace,
        schemaId,
        key,
      } = parsePath(path)

      logger.info(
        `postItem: ${id} -> ${namespace}/${schemaId}/${key}`,
        {
          id,
          namespace,
          schemaId,
          key,
        },
      )

      ajv.validate(
        schemaId,
        data,
      )

      return redis.data.insertOne(
        {
          key,
          path,
          value: data as RedisJSON,
        },
      )
    }),
})

export type DataRouter = typeof dataRouter
