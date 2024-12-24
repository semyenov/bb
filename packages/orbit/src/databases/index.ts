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
  op: 'PUT' | 'DEL' | 'ADD'
  key: string | null
  value: T | null
}

export interface DatabaseTypeMap<T = unknown> {
  'events': EventsDatabase<T>
  'documents': DocumentsDatabase<T>
  'keyvalue': KeyValueDatabase<T>
  'keyvalue-indexed': KeyValueIndexedDatabase<T>
}

export interface DatabaseType<T, D extends keyof DatabaseTypeMap<T> = keyof DatabaseTypeMap<T>, O extends DatabaseOptions<T> = DatabaseOptions<T>> {
  type: D
  create: (options: O) => Promise<DatabaseTypeMap<T>[D]>
}

const databaseTypes: Record<
  string,
  DatabaseType<any>['create']
> = {}

export function useDatabaseType<T>({ type, create }: DatabaseType<T>) {
  if (!type) {
    throw new Error('Database type does not contain required field \'type\'.')
  }

  databaseTypes[type] = create as (options: DatabaseOptions<T>) => Promise<DatabaseTypeMap<T>[typeof type]>
}

export function getDatabaseType<
  T = unknown,
  D extends keyof DatabaseTypeMap<T> = 'events',
>(type: D) {
  if (!type) {
    throw new Error('Type not specified')
  }

  if (!databaseTypes[type]) {
    throw new Error(`Unsupported database type: '${type}'`)
  }

  return databaseTypes[type] as (options: DatabaseOptions<T>) => Promise<DatabaseTypeMap<T>[D]>
}

useDatabaseType(Events)
useDatabaseType(Documents)
useDatabaseType(KeyValue)
useDatabaseType(KeyValueIndexed)

export * from './documents'
export * from './events'
export * from './keyvalue'
export * from './keyvalue-indexed'
