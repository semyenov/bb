import { URL } from 'node:url'
import { split } from 'remeda'

export function parsePath(path: string) {
  const parsed = new URL(
    path,
    '',
  )
  const [
    namespace,
    schemaId,
    key,
  ] = split(
    parsed.pathname,
    '/',
  )

  return {
    key,
    namespace,
    schemaId,
  }
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isStringArray(value: unknown): value is string[] {
  return Array
    .isArray(value) && value
    .every(isString)
}

export function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
}
