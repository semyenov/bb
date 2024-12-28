import { createLogger } from '@regioni/lib-logger'

export const logger = createLogger({
  defaultMeta: {
    label: 'root',
    module: 'backend',
    service: 'server',
    version: '1.0.0',
  },
})
