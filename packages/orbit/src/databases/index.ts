import type { DatabaseOptions } from '../database'
import type { DocumentsDatabase } from './documents'
import type { EventsDatabase } from './events'
import type { KeyValueDatabase } from './keyvalue'
import type { KeyValueIndexedDatabase } from './keyvalue-indexed'

import { Documents } from './documents'
import { Events } from './events'
import { KeyValue } from './keyvalue'
import { KeyValueIndexed } from './keyvalue-indexed'

export interface DatabaseOperation<T> {
  key: null | string
  op: 'ADD' | 'DEL' | 'PUT'
  value: null | T
}

export interface DatabaseTypeMap<T = unknown> {
  'documents': DocumentsDatabase<T>
  'events': EventsDatabase<T>
  'keyvalue': KeyValueDatabase<T>
  'keyvalue-indexed': KeyValueIndexedDatabase<T>
}

export interface DatabaseType<T, D extends keyof DatabaseTypeMap<T>> {
  create: (options: DatabaseOptions<T>) => Promise<DatabaseTypeMap<T>[D]>
  type: D
}

const databaseTypes: Record<
  string,
  (options: DatabaseOptions<any>) => Promise<DatabaseTypeMap<any>[keyof DatabaseTypeMap<any>]>
> = {}

export function useDatabaseType<T, D extends keyof DatabaseTypeMap<T>>(database: DatabaseType<T, D>) {
  if (!database.type) {
    throw new Error('Database type does not contain required field \'type\'.')
  }

  databaseTypes[database.type] = database.create
}

export function getDatabaseType<
  T = unknown,
  D extends keyof DatabaseTypeMap<T> = 'events',
>(type: D) {
  if (!type) {
    throw new Error('Type not specified')
  }

  if (!databaseTypes[type!]) {
    throw new Error(`Unsupported database type: '${type}'`)
  }

  return databaseTypes[type!]
}

useDatabaseType(Events)
useDatabaseType(Documents)
useDatabaseType(KeyValue)
useDatabaseType(KeyValueIndexed)

export * from './documents'
export * from './events'
export * from './keyvalue'
export * from './keyvalue-indexed'
