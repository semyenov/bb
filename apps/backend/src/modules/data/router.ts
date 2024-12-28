import { wrap } from '@typeschema/typebox'

import type { RedisJSON } from '@/libs/redis'

import { createLogger } from '@/libs/logger'
import { parsePath } from '@/libs/pointers'

import { publicProcedure, rootRouter } from '../../trpc/trpc'
import { GetItemInputSchema, PostItemInputSchema } from './schema'

const logger = createLogger({
  defaultMeta: {
    label: 'data',
    service: 'backend',
    version: '0.0.1',
  },
})

export const dataRouter = rootRouter({
  getAll: publicProcedure.query(({ ctx: { redis } }) => {
    return redis.data.getAll()
  }),

  getItem: publicProcedure
    .input(wrap(GetItemInputSchema))
    .query(({
      ctx: { redis },
      input: { id },
    }) => {
      return redis.data.findOne(
        id,
      )
    }),

  postItem: publicProcedure
    .input(wrap(PostItemInputSchema))
    .mutation(({
      ctx: { ajv, redis },
      input: { data, id, path },
    }) => {
      const {
        key,
        namespace,
        schemaId,
      } = parsePath(path)

      logger.info(
        `postItem: ${id} -> ${namespace}/${schemaId}/${key}`,
        {
          id,
          key,
          namespace,
          schemaId,
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
