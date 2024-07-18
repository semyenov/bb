import { Queue } from 'bullmq'
export * from './events'

export const bullmq = new Queue<{ message: string }, { status: number }>(
  'appQueue',
  {
    connection: {
      host: 'redis',
      port: 6379,
    },
    defaultJobOptions: {
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: false,
      removeOnFail: false,
    },
  },
)
