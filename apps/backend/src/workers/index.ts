import { sleep } from '@antfu/utils'
import { createLogger } from '@regioni/lib-logger'
import { Worker } from 'bullmq'

const logger = createLogger()

const worker = new Worker<{ message: string }, { status: number }>(
  'appQueue',
  async (job) => {
    logger.info('Job received', job.data)

    if (job.data.message === 'error') {
      throw new Error(`No one likes ${job.data.message}s`)
    }

    if (Number.parseInt(job.id || '0') % 5 === 0) {
      await sleep(1000)
    }

    return { status: 200 + Math.floor(Math.random() * 100) }
  },
  {
    concurrency: 10,
    connection: {
      host: 'redis',
      port: 6379,
    },
  },
)

worker.on('completed', (job) => {
  logger.info('Job completed', job.returnvalue)
})

worker.on('failed', (job, err) => {
  logger.error(err.message, job?.data)
})
