import { QueueEvents } from 'bullmq'

export const queueEvents = new QueueEvents('appQueue', {
  connection: {
    host: 'redis',
    port: 6379,
  },
})
