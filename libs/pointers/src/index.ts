import { URL } from 'node:url'

import { split } from 'remeda'

export function parsePath(path: string) {
  const parsed = new URL(path, '')
  const [namespace, schema, key] = split(parsed.pathname, '/')

  return { namespace, schemaId: schema, key }
}
