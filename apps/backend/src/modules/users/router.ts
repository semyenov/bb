import { createLogger } from '@regioni/lib-logger'

import { Type } from '@sinclair/typebox'

import { wrap } from '@typeschema/typebox'
import { publicProcedure, rootRouter } from '../../trpc'
import { UserSchema } from './schema'

const logger = createLogger({
  defaultMeta: {
    service: 'users',
  },
})

export const usersRouter = rootRouter({
  getAll: publicProcedure.query(({ ctx: { redis } }) => {
    return redis.users.getAll()
  }),

  getItem: publicProcedure
    .input(wrap(Type.Object({ id: Type.String() })))
    .query(({ input: { id }, ctx: { redis } }) => {
      return redis.users.findOne(id)
    }),

  postItem: publicProcedure
    .input(wrap(UserSchema))
    .mutation(async ({ input: user, ctx: { redis } }) => {
      if (!user.id) {
        throw new Error('Invalid id')
      }

      logger.info(`postItem: ${user.id}`, {
        id: user.id,
      })

      await redis.users.insertOne(user.id, user)
    }),
})

export type UsersRouter = typeof usersRouter
