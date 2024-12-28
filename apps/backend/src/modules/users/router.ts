import { createLogger } from '@regioni/lib-logger'
import { Type } from '@sinclair/typebox'
import { wrap } from '@typeschema/typebox'

import { publicProcedure, rootRouter } from '../../lib/trpc'
import { UserSchema } from './schema'

const logger = createLogger({
  defaultMeta: {
    label: 'users',
    service: 'backend',
    version: '0.0.1',
  },
})

export const usersRouter = rootRouter({
  getAll: publicProcedure.query(({
    ctx: { redis },
  }) => {
    return redis.users.getAll()
  }),

  getItem: publicProcedure
    .input(wrap(Type.Object({ id: Type.String() })))
    .query(({
      ctx: { redis },
      input: { id },
    }) => {
      return redis.users.findOne(
        id,
      )
    }),

  postItem: publicProcedure
    .input(wrap(UserSchema))
    .mutation(async ({
      ctx: { redis },
      input: { id, ...user },
    }) => {
      if (!id) {
        throw new Error('Invalid id')
      }

      logger.info(`postItem: ${id}`, {
        id,
      })

      await redis.users.insertOne({
        key: id,
        path: '$',
        value: user,
      })
    }),
})

export type UsersRouter = typeof usersRouter
