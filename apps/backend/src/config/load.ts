import { validate } from '@typeschema/typebox'
import { loadConfig as c12LoadConfig } from 'c12'

import type { Config } from './schema'

import { ErrorConfigNotFound, ErrorConfigNotValid } from './errors'
import { ConfigSchema } from './schema'

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

  return c.data
}
