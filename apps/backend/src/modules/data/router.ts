import { parsePath } from '@regioni/lib-pointers'
import { wrap } from '@typeschema/typebox'
import consola from 'consola'

import { publicProcedure, rootRouter } from '../../trpc'

import { GetItemInputSchema, PostItemInputSchema } from './schema'

const logger = consola.withTag('server')

export const dataRouter = rootRouter({
  getAll: publicProcedure.query(({ ctx: { redis } }) => redis.data.getAll()),

  getItem: publicProcedure
    .input(wrap(GetItemInputSchema))
    .query(({ input: { id }, ctx: { redis } }) => redis.data.findOne(id)),

  postItem: publicProcedure
    .input(wrap(PostItemInputSchema))
    .mutation(({ input: { id, path, data }, ctx: { redis, ajv } }) => {
      // Check if id is valid and unique

      // Check if path is valid
      const { namespace, schemaId, key } = parsePath(path)
      logger.info(`postItem: ${id} -> ${namespace}/${schemaId}/${key}`, {
        id,
        namespace,
        schemaId,
        key,
      })

      ajv.validate(schemaId || 'unknown', data)
      // const job = await bullmq.add('appQueue', {
      //   message: JSON.stringify(data),
      // })

      return redis.data.insertOne(id, data)
    }),

  // randomNumber: publicProcedure
  //   .input(wrap(Type.Number()))
  //   .subscription(({ input: n, ctx: { bullmq } }) =>
  //     observable<{ status: number }>((emit) => {
  //       logger.info(`subscription: Running subscription with n = ${n}`)
  //       queueEvents.on('completed', async ({ jobId }) => {
  //         logger.info(`subscription: Job ${jobId} completed`)
  //         const job = await bullmq.getJob(jobId)
  //         if (job && job.returnvalue && job.returnvalue.status % n === 0) {
  //           emit.next(job.returnvalue)
  //         }
  //       })
  //     }),
  //   ),
})

export type DataRouter = typeof dataRouter
