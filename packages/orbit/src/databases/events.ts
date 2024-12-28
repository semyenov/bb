import type { PeerSet } from '@libp2p/peer-collections'

import type { DatabaseOperation, DatabaseType } from '.'
import type { LogInstance } from '../oplog/log'
import type { SyncEvents, SyncInstance } from '../sync'

import { DATABASE_EVENTS_TYPE } from '../constants'
import {
  Database,
  type DatabaseInstance,
  type DatabaseOptions,
} from '../database'

export interface EventsDoc<T = unknown> {
  hash?: string
  key?: string
  value: null | T
}

export interface EventsIteratorOptions {
  amount?: number
  gt?: string
  gte?: string
  lt?: string
  lte?: string
}

export type EventsOptions<T = unknown> = DatabaseOptions<T>
export interface EventsInstance<T = unknown> extends DatabaseInstance<T> {
  add: (value: T) => Promise<string>

  all: () => Promise<Omit<EventsDoc<T>, 'key'>[]>
  get: (hash: string) => Promise<null | T>
  iterator: (options: EventsIteratorOptions) => AsyncIterable<EventsDoc<T>>
  type: 'events'
}

export class EventsDatabase<T = unknown> implements EventsInstance<T> {
  static get type(): 'events' {
    return DATABASE_EVENTS_TYPE
  }

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

  get type(): 'events' {
    return DATABASE_EVENTS_TYPE
  }

  private database: DatabaseInstance<T>

  private constructor(database: DatabaseInstance<T>) {
    this.database = database
  }

  static async create<T>(
    options: EventsOptions<T>,
  ): Promise<EventsDatabase<T>> {
    const database = await Database.create<T>(options)

    return new EventsDatabase<T>(database)
  }

  async add(value: T): Promise<string> {
    return this.database.addOperation({ key: null, op: 'ADD', value })
  }

  async addOperation(operation: DatabaseOperation<T>): Promise<string> {
    return this.database.addOperation(operation)
  }

  async all(): Promise<Omit<EventsDoc<T>, 'key'>[]> {
    const values = []
    for await (const entry of this.iterator()) {
      values.unshift(entry)
    }

    return values
  }

  close(): Promise<void> {
    return this.database.close()
  }

  drop(): Promise<void> {
    return this.database.drop()
  }

  async get(hash: string): Promise<null | T> {
    const entry = await this.database.log.get(hash)

    return entry ? entry.payload.value : null
  }

  async *iterator({
    amount,
    gt,
    gte,
    lt,
    lte,
  }: EventsIteratorOptions = {}): AsyncIterable<EventsDoc<T>> {
    const it = this.database.log.iterator({ amount, gt, gte, lt, lte })
    for await (const event of it) {
      const hash = event.hash!
      const { value } = event.payload
      yield { hash, value }
    }
  }
}

export const Events: DatabaseType<unknown, 'events'> = {
  create: EventsDatabase.create,
  type: DATABASE_EVENTS_TYPE,
}
