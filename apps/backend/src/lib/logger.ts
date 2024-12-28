import { createLogger } from '@regioni/lib-logger'

export const logger = createLogger({
  defaultMeta: {
    label: 'root',
    service: 'server',
    version: '1.0.0',
  },
})
