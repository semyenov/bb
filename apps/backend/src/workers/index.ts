import { sleep } from '@antfu/utils'
import { Worker } from 'bullmq'

export const worker = new Worker<{ message: string }, { status: number }>(
  'appQueue',
  async (job) => {
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
