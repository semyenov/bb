import { createLogger } from '@regioni/lib-logger'
import { validate } from '@typeschema/typebox'
import { loadConfig as c12LoadConfig } from 'c12'

import { ErrorConfigNotFound, ErrorConfigNotValid } from './errors'
import { type Config, ConfigSchema } from './schema'

const logger = createLogger({
  defaultMeta: {
    service: 'config',
    label: 'index',
  },
})

export async function loadConfig() {
  const { config, configFile } = await c12LoadConfig<Config>({
    name: 'regioni',
  })

  if (!configFile) {
    throw ErrorConfigNotFound
  }

  const c = await validate(ConfigSchema, config)
  if (!c.success) {
    throw ErrorConfigNotValid
  }

  logger.info('Config successfully loaded', { res: c.data })

  return c.data
}
