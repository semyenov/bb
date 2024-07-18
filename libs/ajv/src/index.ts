import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { createLogger } from '@regioni/lib-logger'
import { TRPCError } from '@trpc/server'
import Ajv from 'ajv'
import ajvErrors from 'ajv-errors'
import ajvFormats from 'ajv-formats'
import ajvI18n from 'ajv-i18n'
import ajvKeywords from 'ajv-keywords'
import glob from 'fast-glob'

import { userSchema } from './schema'

import type { AnySchemaObject } from 'ajv'

const logger = createLogger({
  defaultMeta: {
    service: 'ajv',
    label: 'create',
  },
})

export async function createAjv() {
  const ajv = new Ajv({
    logger,

    schemaId: '$id',

    meta: true,
    strict: 'log',
    strictTypes: 'log',
    allErrors: true,
    messages: false,
    verbose: true,
  })

  const files = await glob('*.json', {
    cwd: 'defs',
    absolute: true,
  })

  const schemas = await Promise.all(
    files.map(async (file) => {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const fileContent = await readFile(file, 'utf8')
      const schemaId = basename(file, '.json')
      const schema = JSON.parse(fileContent) as AnySchemaObject

      return { ...schema, $id: schemaId }
    }),
  )

  ajvKeywords(ajv)
  ajvFormats(ajv)
  ajvErrors(ajv)

  ajv.addSchema(schemas)
  ajv.addSchema(userSchema, 'User')

  return {
    add(schemaId: string, schema: AnySchemaObject) {
      ajv.addSchema(schema, schemaId)
    },
    get<T = unknown>(schemaId: string) {
      return ajv.getSchema<T>(schemaId)
    },
    validate(schemaId: string, data: unknown) {
      const valid = ajv.validate(schemaId, data)

      if (!valid) {
        ajvI18n.ru(ajv.errors)

        throw new TRPCError({
          cause: ajv.errors,
          code: 'BAD_REQUEST',
          message: ajv.errorsText(ajv.errors, {
            separator: '\n',
            dataVar: 'data',
          }),
        })
      }

      return valid
    },
  }
}
