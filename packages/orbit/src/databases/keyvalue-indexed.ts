import type { PeerSet } from '@libp2p/peer-collections'

import type { DatabaseOperation, DatabaseType } from '.'
import type { DatabaseInstance, DatabaseOptions } from '../database'
import type { EntryInstance } from '../oplog/entry'
import type { LogInstance } from '../oplog/log'
import type { StorageInstance } from '../storage'
import type { SyncEvents, SyncInstance } from '../sync'

import {
  DATABASE_KEYVALUE_INDEXED_TYPE,
  DATABASE_KEYVALUE_INDEXED_VALUE_ENCODING,
} from '../constants'
import { LevelStorage } from '../storage/level'
import { join } from '../utils'
import { KeyValueDatabase, type KeyValueInstance } from './keyvalue'

class Index<T> {
  private index: LevelStorage<EntryInstance<DatabaseOperation<T>>>
  private indexedEntries: LevelStorage<boolean>

  private constructor(
    index: LevelStorage<EntryInstance<DatabaseOperation<T>>>,
    indexedEntries: LevelStorage<boolean>,
  ) {
    this.index = index
    this.indexedEntries = indexedEntries
  }

  static async create<T>(directory?: string): Promise<Index<T>> {
    const index = await LevelStorage.create<
      EntryInstance<DatabaseOperation<T>>
    >({
      path: directory,
      valueEncoding: DATABASE_KEYVALUE_INDEXED_VALUE_ENCODING,
    })
    const indexedEntries = await LevelStorage.create<boolean>({
      path: join(directory || './.orbitdb', `/_indexedEntries/`),
      valueEncoding: DATABASE_KEYVALUE_INDEXED_VALUE_ENCODING,
    })

    return new Index<T>(index, indexedEntries)
  }

  async close(): Promise<void> {
    await this.index.close()
    await this.indexedEntries.close()
  }

  async drop(): Promise<void> {
    await this.index.clear()
    await this.indexedEntries.clear()
  }

  get(key: string): Promise<EntryInstance<DatabaseOperation<T>> | null> {
    return this.index.get(key)
  }

  iterator(
    options: any = {},
  ): AsyncIterable<[string, EntryInstance<DatabaseOperation<T>>]> {
    return this.index.iterator({
      limit: options.amount || -1,
      ...options,
    })
  }

  async update(
    log: LogInstance<DatabaseOperation<T>>,
    entry: EntryInstance<DatabaseOperation<T>> | EntryInstance<T>,
  ): Promise<void> {
    const keys = new Set()
    const toBeIndexed = new Set()
    const latest = entry.hash

    const isIndexed = async (hash: string): Promise<boolean> => {
      return (await this.indexedEntries.get(hash)) === true
    }
    const isNotIndexed = async (hash: string): Promise<boolean> => {
      return !(await isIndexed(hash))
    }

    const shoudStopTraverse = async (
      entry: EntryInstance<DatabaseOperation<T>>,
    ) => {
      for await (const hash of entry.next!) {
        if (await isNotIndexed(hash)) {
          toBeIndexed.add(hash)
        }
      }

      return (await isIndexed(latest!)) && toBeIndexed.size === 0
    }

    for await (const entry of log.traverse(
      null,
      shoudStopTraverse,
    )) {
      const { hash, payload } = entry
      if (hash && (await isNotIndexed(hash))) {
        const { key, op } = payload
        if (op === 'PUT' && !keys.has(key)) {
          keys.add(key)
          await this.index.put(key!, entry)
          await this.indexedEntries.put(hash!, true)
        }
        else if (op === 'DEL' && !keys.has(key)) {
          keys.add(key)
          await this.index.del(key!)
          await this.indexedEntries.put(hash!, true)
        }
        toBeIndexed.delete(hash)
      }
    }
  }
}

export interface KeyValueIndexedOptions<T> {
  storage?: StorageInstance<T>
}

export interface KeyValueIndexedInstance<T = unknown>
  extends DatabaseInstance<T> {
  type: 'keyvalue-indexed'
}

export class KeyValueIndexedDatabase<T = unknown>
implements KeyValueIndexedInstance<T> {
  static get type(): 'keyvalue-indexed' {
    return DATABASE_KEYVALUE_INDEXED_TYPE
  }

  get accessController(): DatabaseInstance<T>['accessController'] {
    return this.keyValueStore.accessController
  }

  get address(): string | undefined {
    return this.keyValueStore.address
  }

  get events(): DatabaseInstance<T>['events'] {
    return this.keyValueStore.events
  }

  get identity(): DatabaseInstance<T>['identity'] {
    return this.keyValueStore.identity
  }

  get log(): LogInstance<DatabaseOperation<T>> {
    return this.keyValueStore.log
  }

  get meta(): any {
    return this.keyValueStore.meta
  }

  get name(): string | undefined {
    return this.keyValueStore.name
  }

  get peers(): PeerSet {
    return this.keyValueStore.peers
  }

  get sync(): SyncInstance<
    DatabaseOperation<T>,
    SyncEvents<DatabaseOperation<T>>
  > {
    return this.keyValueStore.sync
  }

  get type(): 'keyvalue-indexed' {
    return DATABASE_KEYVALUE_INDEXED_TYPE
  }

  private index: Index<T>

  private keyValueStore: KeyValueInstance<T>

  private constructor(keyValueStore: KeyValueInstance<T>, index: Index<T>) {
    this.keyValueStore = keyValueStore
    this.index = index
  }

  static async create<T>(
    options: DatabaseOptions<T> & KeyValueIndexedOptions<T>,
  ): Promise<KeyValueIndexedDatabase<T>> {
    const {
      accessController,
      address,
      dir,
      entryStorage,
      headsStorage,
      identity,
      indexStorage,
      ipfs,
      meta,
      name,
      referencesCount,
      syncAutomatically,
    } = options

    const indexDirectory = join(
      dir || './.orbitdb',
      `./${address}/_index/`,
    )

    const index = await Index.create<T>(indexDirectory)
    const keyValueStore = await KeyValueDatabase.create({
      accessController,
      address,
      dir,
      entryStorage,
      headsStorage,
      identity,
      indexStorage,
      ipfs,
      meta,
      name,
      onUpdate: index.update.bind(index),
      referencesCount,
      syncAutomatically,
    })

    return new KeyValueIndexedDatabase(keyValueStore, index)
  }

  async addOperation(operation: DatabaseOperation<T>): Promise<string> {
    return this.keyValueStore.addOperation(operation)
  }

  async close(): Promise<void> {
    await this.keyValueStore.close()
    await this.index.close()
  }

  del(key: string): Promise<string> {
    return this.keyValueStore.del(key)
  }

  async drop(): Promise<void> {
    await this.keyValueStore.drop()
    await this.index.drop()
  }

  async get(key: string): Promise<null | T> {
    const entry = await this.index.get(key)
    if (entry) {
      return entry.payload.value
    }

    return null
  }

  async *iterator({ amount = -1 }: { amount?: number } = {}): AsyncIterable<{
    hash: string
    key: string
    value: null | T
  }> {
    for await (const [key, entry] of this.index.iterator({
      amount,
      reverse: true,
    })) {
      const { value } = entry.payload
      const { hash } = entry
      if (!hash) {
        continue
      }

      yield {
        hash,
        key,
        value,
      }
    }
  }

  put(key: string, value: T): Promise<string> {
    return this.keyValueStore.put(key, value)
  }
}

export const KeyValueIndexed: DatabaseType<unknown, 'keyvalue-indexed'> = {
  create: KeyValueIndexedDatabase.create,
  type: DATABASE_KEYVALUE_INDEXED_TYPE,
}
