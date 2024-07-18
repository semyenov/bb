import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { TRPCError } from '@trpc/server'
import Ajv from 'ajv'
import ajvErrors from 'ajv-errors'
import ajvFormats from 'ajv-formats'
import ajvI18n from 'ajv-i18n'
import ajvKeywords from 'ajv-keywords'
import consola from 'consola'
import glob from 'fast-glob'

import { userSchema } from './schema'

import type { AnySchemaObject } from 'ajv'

const logger = consola.withTag('ajv')

/**
 * Creates an instance of Ajv, a JSON schema validator, and returns an object
 * containing helper functions for adding and validating schemas.
 *
 * @return {object} An object with the following properties:
 *   - addSchema: A function that adds a schema to the Ajv instance.
 *   - getSchema: A function that retrieves a schema from the Ajv instance.
 *   - validateSchema: A function that validates data against a schema.
 */
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
