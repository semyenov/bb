import type { PeerSet } from '@libp2p/peer-collections'

import type { DatabaseOperation, DatabaseType } from '.'
import type { LogInstance } from '../oplog/log'
import type { SyncEvents, SyncInstance } from '../sync'

import { DATABASE_DOCUMENTS_TYPE } from '../constants'
import {
  Database,
  type DatabaseInstance,
  type DatabaseOptions,
} from '../database'

export interface DocumentsDoc<T = unknown> {
  hash?: string
  key?: string
  value: null | T
}

export interface DocumentsIteratorOptions {
  amount?: number
}

export interface DocumentsOptions {
  indexBy?: string
}

export interface DocumentsInstance<T = unknown> extends DatabaseInstance<T> {
  all: () => Promise<DocumentsDoc<T>[]>
  del: (key: string) => Promise<string>

  get: (key: string) => Promise<DocumentsDoc<T> | null>
  indexBy: string
  iterator: (
    options?: DocumentsIteratorOptions,
  ) => AsyncIterable<DocumentsDoc<T>>
  put: (doc: T) => Promise<string>
  query: (findFn: (doc: T) => boolean) => Promise<T[]>
  type: 'documents'
}

export class DocumentsDatabase<T = unknown> implements DocumentsInstance<T> {
  static get type(): 'documents' {
    return DATABASE_DOCUMENTS_TYPE
  }

  public indexBy = '_id'

  get accessController(): DatabaseInstance<T>['accessController'] {
    return this.database.accessController
  }

  get address(): string | undefined {
    return this.database.address
  }

  get events(): DatabaseInstance<T>['events'] {
    return this.database.events
  }

  get identity(): DatabaseInstance<T>['identity'] {
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

  get type(): 'documents' {
    return DATABASE_DOCUMENTS_TYPE
  }

  private database: DatabaseInstance<T>

  private constructor(database: DatabaseInstance<T>, indexBy: string) {
    this.database = database
    this.indexBy = indexBy
  }

  static async create<T>(
    options: DatabaseOptions<T> & DocumentsOptions,
  ): Promise<DocumentsDatabase<T>> {
    const indexBy = options.indexBy || '_id'
    const database = await Database.create<T>(options)

    return new DocumentsDatabase<T>(database, indexBy)
  }

  async addOperation(operation: DatabaseOperation<T>): Promise<string> {
    return this.database.addOperation(operation)
  }

  async all(): Promise<DocumentsDoc<T>[]> {
    const values: DocumentsDoc<T>[] = []
    for await (const entry of this.iterator()) {
      values.unshift(entry)
    }

    return values
  }

  close(): Promise<void> {
    return this.database.close()
  }

  async del(key: string): Promise<string> {
    if (!(await this.get(key))) {
      throw new Error(`No document with key '${key}' in the database`)
    }

    return this.database.addOperation({ key, op: 'DEL', value: null })
  }

  drop(): Promise<void> {
    return this.database.drop()
  }

  async get(key: string): Promise<DocumentsDoc<T> | null> {
    for await (const doc of this.iterator()) {
      if (key === doc.key) {
        return doc
      }
    }

    return null
  }

  async *iterator({ amount }: DocumentsIteratorOptions = {}): AsyncGenerator<
    DocumentsDoc<T>,
    void,
    unknown
  > {
    const keys: Record<string, boolean> = {}
    let count = 0
    const files = []
    for await (const entry of this.database.log.iterator()) {
      files.push(entry)
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

  async put(doc: T): Promise<string> {
    const key = doc[this.indexBy as keyof T]
    if (!key) {
      throw new Error(
        `The provided document doesn't contain field '${String(this.indexBy)}'`,
      )
    }

    return this.database.addOperation({
      key: String(key),
      op: 'PUT',
      value: doc,
    })
  }

  async query(findFn: (doc: T) => boolean): Promise<T[]> {
    const results: T[] = []
    for await (const doc of this.iterator()) {
      if (doc.value && findFn(doc.value)) {
        results.push(doc.value)
      }
    }

    return results
  }
}

export const Documents: DatabaseType<unknown, 'documents'> = {
  create: DocumentsDatabase.create,
  type: DATABASE_DOCUMENTS_TYPE,
}
