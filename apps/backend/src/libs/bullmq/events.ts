import { QueueEvents } from 'bullmq'

export const queueEvents = new QueueEvents('appQueue', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
})
