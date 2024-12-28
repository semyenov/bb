import type { PeerSet } from '@libp2p/peer-collections'

import type { DatabaseOperation, DatabaseType } from '.'
import type { AccessControllerInstance } from '../access-controllers'
import type { DatabaseInstance, DatabaseOptions } from '../database'
import type { IdentityInstance } from '../identities'
import type { LogInstance } from '../oplog/log'
import type { StorageInstance } from '../storage'
import type { SyncEvents, SyncInstance } from '../sync'

import { DATABASE_KEYVALUE_TYPE } from '../constants'
import { Database } from '../database'

export interface KeyValueOptions<T> {
  storage?: StorageInstance<T>
}

export interface KeyValueEntry<T> {
  hash?: string
  key?: string
  value: null | T
}

export interface KeyValueInstance<T> extends DatabaseInstance<T> {
  all: () => Promise<KeyValueEntry<T>[]>
  del: (key: string) => Promise<string>

  get: (key: string) => Promise<null | T>
  indexBy?: string
  iterator: (options?: { amount?: number }) => AsyncIterable<KeyValueEntry<T>>
  put: (key: string, value: T) => Promise<string>
  set: (key: string, value: T) => Promise<string>
  type: 'keyvalue'
}

export class KeyValueDatabase<T = unknown> implements KeyValueInstance<T> {
  static get type(): 'keyvalue' {
    return DATABASE_KEYVALUE_TYPE
  }

  get accessController(): AccessControllerInstance {
    return this.database.accessController
  }

  get address(): string | undefined {
    return this.database.address
  }

  get events(): DatabaseInstance<T>['events'] {
    return this.database.events
  }

  get identity(): IdentityInstance {
    return this.database.identity
  }

  get log(): LogInstance<DatabaseOperation<T>> {
    return this.database.log
  }

  get meta(): any {
    return this.database.meta
  }

  get name(): string | undefined {
    return this.database.name
  }

  get peers(): PeerSet {
    return this.database.peers
  }

  get sync(): SyncInstance<
    DatabaseOperation<T>,
    SyncEvents<DatabaseOperation<T>>
  > {
    return this.database.sync
  }

  get type(): 'keyvalue' {
    return DATABASE_KEYVALUE_TYPE
  }

  private database: DatabaseInstance<T>

  private constructor(database: DatabaseInstance<T>) {
    this.database = database
  }

  static async create<T>(
    options: DatabaseOptions<T> & KeyValueOptions<T>,
  ): Promise<KeyValueDatabase<T>> {
    const database = await Database.create<T>(options)

    return new KeyValueDatabase<T>(database)
  }

  async addOperation(operation: DatabaseOperation<T>): Promise<string> {
    return this.database.addOperation(operation)
  }

  async all(): Promise<KeyValueEntry<T>[]> {
    const values: KeyValueEntry<T>[] = []
    for await (const entry of this.iterator()) {
      values.unshift(entry)
    }

    return values
  }

  close(): Promise<void> {
    return this.database.close()
  }

  async del(key: string): Promise<string> {
    return this.database.addOperation({ key, op: 'DEL', value: null })
  }

  drop(): Promise<void> {
    return this.database.drop()
  }

  async get(key: string): Promise<null | T> {
    for await (const entry of this.database.log.traverse()) {
      const { key: k, op, value } = entry.payload
      if (op === 'PUT' && k === key) {
        return value as T
      }
      else if (op === 'DEL' && k === key) {
        return null
      }
    }

    return null
  }

  async *iterator({ amount }: { amount?: number } = {}): AsyncIterable<
    KeyValueEntry<T>
  > {
    const keys: Record<string, boolean> = {}
    let count = 0
    for await (const entry of this.database.log.traverse()) {
      const { key, op, value } = entry.payload
      if (op === 'PUT' && !keys[key!]) {
        keys[key!] = true
        count++
        const hash = entry.hash!
        yield { hash, key: key!, value: value || null }
      }
      else if (op === 'DEL' && !keys[key!]) {
        keys[key!] = true
      }
      if (amount !== undefined && count >= amount) {
        break
      }
    }
  }

  async put(key: string, value: T): Promise<string> {
    return this.database.addOperation({ key, op: 'PUT', value })
  }

  async set(key: string, value: T): Promise<string> {
    return this.put(key, value)
  }
}

export const KeyValue: DatabaseType<unknown, 'keyvalue'> = {
  create: KeyValueDatabase.create,
  type: DATABASE_KEYVALUE_TYPE,
}
