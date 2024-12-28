import type { PeerSet } from '@libp2p/peer-collections'

import { TypedEventEmitter } from '@libp2p/interface'
import PQueue from 'p-queue'

import type { AccessControllerInstance } from './access-controllers'
import type { DatabaseOperation } from './databases'
import type {
  IdentitiesInstance,
  IdentityInstance,
} from './identities'
import type { EntryInstance } from './oplog/entry'
import type { LogInstance } from './oplog/log'
import type {
  StorageInstance,
} from './storage'
import type { SyncEvents, SyncInstance } from './sync'
import type { OrbitDBHeliaInstance, PeerId } from './vendor.d'

import {
  DATABASE_CACHE_SIZE,
  DATABASE_PATH,
  DATABASE_REFERENCES_COUNT,
} from './constants'
import { Entry, Log } from './oplog'
import {
  ComposedStorage,
  IPFSBlockStorage,
  LevelStorage,
  LRUStorage,
} from './storage'
import { Sync } from './sync'
import { join } from './utils'

export interface DatabaseOptions<T> {
  accessController: AccessControllerInstance
  address?: string
  dir: string
  entryStorage?: StorageInstance<Uint8Array>
  headsStorage?: StorageInstance<Uint8Array>
  identities?: IdentitiesInstance
  identity: IdentityInstance
  indexStorage?: StorageInstance<boolean>
  ipfs: OrbitDBHeliaInstance
  meta?: any
  name?: string
  onUpdate?: (
    log: LogInstance<DatabaseOperation<T>>,
    entry: EntryInstance<DatabaseOperation<T>> | EntryInstance<T>,
  ) => Promise<void>
  referencesCount?: number
  syncAutomatically?: boolean
}

export interface DatabaseEvents<T = unknown> {
  close: CustomEvent
  drop: CustomEvent
  error: ErrorEvent
  join: CustomEvent<{ peerId: PeerId, heads: EntryInstance<T>[] }>
  leave: CustomEvent<{ peerId: PeerId }>
  update: CustomEvent<{ entry: EntryInstance<T> }>
}

export interface DatabaseInstance<
  T,
  E extends DatabaseEvents<T> = DatabaseEvents<T>,
> {
  accessController: AccessControllerInstance
  addOperation: (op: DatabaseOperation<T>) => Promise<string>
  address?: string
  close: () => Promise<void>
  drop: () => Promise<void>
  events: TypedEventEmitter<E>
  identity: IdentityInstance
  log: LogInstance<DatabaseOperation<T>>
  meta: any
  name?: string
  peers: PeerSet
  sync: SyncInstance<DatabaseOperation<T>, SyncEvents<DatabaseOperation<T>>>
}

export class Database<
  T = unknown,
  E extends DatabaseEvents<T> = DatabaseEvents<T> & SyncEvents<T>,
> implements DatabaseInstance<T, E> {
  public accessController: AccessControllerInstance
  public address?: string
  public events: TypedEventEmitter<E>
  public identity: IdentityInstance
  public indexBy?: string
  public log: LogInstance<DatabaseOperation<T>>
  public meta: any

  public name?: string
  public peers: PeerSet
  public sync: SyncInstance<
    DatabaseOperation<T>,
    SyncEvents<DatabaseOperation<T>>
  >

  private onUpdate?: (
    log: LogInstance<DatabaseOperation<T>>,
    entry: EntryInstance<DatabaseOperation<T>> | EntryInstance<T>,
  ) => Promise<void>

  private queue: PQueue

  private constructor(
    identity: IdentityInstance,
    accessController: AccessControllerInstance,
    log: LogInstance<DatabaseOperation<T>>,
    sync: SyncInstance<DatabaseOperation<T>, SyncEvents<DatabaseOperation<T>>>,
    events: TypedEventEmitter<DatabaseEvents<T>>,
    queue: PQueue,

    name?: string,
    address?: string,
    meta?: any,
    onUpdate?: (
      log: LogInstance<DatabaseOperation<T>>,
      entry: EntryInstance<DatabaseOperation<T>> | EntryInstance<T>,
    ) => Promise<void>,
  ) {
    this.meta = meta
    this.name = name
    this.address = address
    this.identity = identity
    this.accessController = accessController
    this.onUpdate = onUpdate
    this.events = events
    this.queue = queue

    this.log = log
    this.sync = sync
    this.peers = this.sync.peers
  }

  static async create<T>(options: DatabaseOptions<T>) {
    const {
      accessController,
      address,
      dir: directory,
      identity,
      ipfs,
      meta = {},
      name,
      onUpdate,
      syncAutomatically = true,
    } = options

    const path = join(
      directory || DATABASE_PATH,
      `./${address}/`,
    )

    const events = new TypedEventEmitter<DatabaseEvents<T>>()
    const queue = new PQueue({ concurrency: 1 })

    const entryStorage
      = options.entryStorage
      || ComposedStorage.create({
        storage1: LRUStorage.create({ size: DATABASE_CACHE_SIZE }),
        storage2: IPFSBlockStorage.create({ ipfs, pin: true }),
      })

    const headsStorage
      = options.headsStorage
      || ComposedStorage.create({
        storage1: LRUStorage.create({ size: DATABASE_CACHE_SIZE }),
        storage2: await LevelStorage.create({
          path: join(path, '/log/_heads/'),
        }),
      })

    const indexStorage
      = options.indexStorage
      || ComposedStorage.create<boolean>({
        storage1: LRUStorage.create<boolean>({ size: DATABASE_CACHE_SIZE }),
        storage2: await LevelStorage.create<boolean>({
          path: join(path, '/log/_index/'),
        }),
      })

    const log = new Log<DatabaseOperation<T>>(identity, {
      accessController,
      entryStorage,
      headsStorage,
      indexStorage,
      logId: address,
    })

    const sync = await Sync.create({
      ipfs,
      log,
      onSynced: async (bytes) => {
        const task = async () => {
          const entry = await Entry.decode<DatabaseOperation<T>>(bytes)
          if (entry) {
            const updated = await log.joinEntry(entry)
            if (updated) {
              if (onUpdate) {
                await onUpdate(log, entry)
              }
              events.dispatchEvent(
                new CustomEvent(
                  'update',
                  {
                    detail: { entry },
                  },
                ),
              )
            }
          }
        }

        await queue.add(task)
      },
      start: syncAutomatically ?? true,
    })

    return new Database(
      identity,
      accessController,
      log,
      sync,
      events,
      queue,
      name,
      address,
      meta,
      onUpdate,
    )
  }

  public async addOperation(op: DatabaseOperation<T>): Promise<string> {
    const task = async () => {
      const entry = await this.log.append(op, {
        referencesCount: DATABASE_REFERENCES_COUNT,
      })
      await this.sync.add(entry)
      if (this.onUpdate) {
        await this.onUpdate(this.log, entry)
      }
      this.events.dispatchEvent(
        new CustomEvent('update', { detail: { entry } }),
      )

      return entry.hash!
    }

    const hash = await this.queue.add(task)
    await this.queue.onIdle()

    return hash as string
  }

  public async close(): Promise<void> {
    await this.sync.stop()
    await this.queue.onIdle()
    await this.log.close()
    if (this.accessController && this.accessController.close) {
      await this.accessController.close()
    }
    this.events.dispatchEvent(new CustomEvent('close'))
  }

  public async drop(): Promise<void> {
    await this.queue.onIdle()
    await this.log.clear()
    if (this.accessController && this.accessController.drop) {
      await this.accessController.drop()
    }
    this.events.dispatchEvent(new CustomEvent('drop'))
  }
}
