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
      if (!id) {
        throw new Error('Invalid id')
      }

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
        id,
        data,
      )
    }),
})

export type DataRouter = typeof dataRouter
