import { createLogger } from '@regioni/lib-logger'

import { Type } from '@sinclair/typebox'

import { wrap } from '@typeschema/typebox'
import { publicProcedure, rootRouter } from '../../trpc'
import { UserSchema } from './schema'

const logger = createLogger({
  defaultMeta: {
    service: 'backend',
    version: '0.0.1',
    label: 'users',
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
      input: { id },
      ctx: { redis },
    }) => {
      return redis.users.findOne(
        id,
      )
    }),

  postItem: publicProcedure
    .input(wrap(UserSchema))
    .mutation(async ({
      input: { id, ...user },
      ctx: { redis },
    }) => {
      if (!id) {
        throw new Error('Invalid id')
      }

      logger.info(`postItem: ${id}`, {
        id,
      })

      await redis.users.insertOne(id, {
        ...user,
        id,
      })
    }),
})

export type UsersRouter = typeof usersRouter
