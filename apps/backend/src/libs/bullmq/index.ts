import { Queue } from 'bullmq'

export * from './events'

export const bullmq = new Queue<{ message: string }, { status: number }>(
  'appQueue',
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
    defaultJobOptions: {
      backoff: {
        delay: 1000,
        type: 'exponential',
      },
      removeOnComplete: false,
      removeOnFail: false,
    },
  },
)
