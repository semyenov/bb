/**
 * @module Database
 * @description
 * Database is the base class for OrbitDB data stores and handles all lower
 * level add operations and database sync-ing using IPFS.
 */
import { EventEmitter } from 'node:events'

import PQueue from 'p-queue'

import { Entry, Log } from './oplog/index.js'
import {
  ComposedStorage,
  IPFSBlockStorage,
  LRUStorage,
  LevelStorage,
  type StorageInstance,
} from './storage/index.js'
import Sync from './sync.js'
import pathJoin from './utils/path-join.js'

import type { AccessControllerInstance } from './access-controllers'
import type {
  IdentitiesInstance,
  IdentityInstance,
} from './identities/index.js'
import type { HeliaInstance, PeerId } from './vendor.js'
import type { DatabaseEvents } from 'packages/orbitdb/events.js'
import type { LogInstance } from 'packages/orbitdb/log.js'
import type { SyncInstance } from 'packages/orbitdb/sync.js'

export interface DatabaseOptions<T> {
  meta: any
  name?: string
  address?: string
  directory: string
  referencesCount?: number
  syncAutomatically?: boolean

  ipfs?: HeliaInstance
  accessController?: AccessControllerInstance
  identity?: IdentityInstance
  identities?: IdentitiesInstance
  headsStorage?: StorageInstance<any>
  entryStorage?: StorageInstance<any>
  indexStorage?: StorageInstance<any>
  onUpdate?: (entry: Entry.Instance<T>) => void
}
export interface DatabaseInstance<T = unknown> {
  address?: string
  name?: string
  type: string
  peers: Set<PeerId>
  indexBy: keyof T
  meta: any

  log: LogInstance<T>
  sync: SyncInstance<T>

  events: DatabaseEvents<T>
  access?: AccessControllerInstance
  identity?: IdentityInstance

  addOperation: (op: any) => Promise<string>
  close: () => Promise<void>
  drop: () => Promise<void>
}

const DEFAULT_REFEREMCES_COUNT = 16
const defaultCacheSize = 1000

const Database = async <T = any>(
  {
    ipfs,
    identity,
    address,
    name,
    accessController,
    directory,
    meta,
    headsStorage,
    entryStorage,
    indexStorage,
    referencesCount,
    syncAutomatically,
    onUpdate,
  }: DatabaseOptions<T> = {
    meta: {},
    directory: './orbitdb',
    referencesCount: DEFAULT_REFEREMCES_COUNT,
  },
) => {
  const path = pathJoin(directory, `./${address}/`)
  const entryDB =
    entryStorage ||
    (await ComposedStorage({
      storage1: await LRUStorage({ size: defaultCacheSize }),
      storage2: await IPFSBlockStorage({ ipfs, pin: true }),
    }))

  const headsDB =
    headsStorage ||
    (await ComposedStorage({
      storage1: await LRUStorage({ size: defaultCacheSize }),
      storage2: await LevelStorage({ path: pathJoin(path, '/log/_heads/') }),
    }))

  const indexDB =
    indexStorage ||
    (await ComposedStorage({
      storage1: await LRUStorage({ size: defaultCacheSize }),
      storage2: await LevelStorage({ path: pathJoin(path, '/log/_index/') }),
    }))

  const log = await Log(identity, {
    logId: address,
    accessController,
    entryStorage: entryDB,
    headsStorage: headsDB,
    indexStorage: indexDB,
  })

  const events = new EventEmitter()

  const queue = new PQueue({ concurrency: 1 })

  /**
   * Adds an operation to the oplog.
   * @function addOperation
   * @param {*} op Some operation to add to the oplog.
   * @return {string} The hash of the operation.
   * @memberof module:Databases~Database
   * @instance
   * @async
   */
  const addOperation = async (op) => {
    const task = async () => {
      const entry = await log.append(op, { referencesCount })
      await sync.add(entry)
      if (onUpdate) {
        await onUpdate(log, entry)
      }
      events.emit('update', entry)
      return entry.hash
    }
    const hash = await queue.add(task)
    await queue.onIdle()
    return hash
  }

  const applyOperation = async (bytes) => {
    const task = async () => {
      const entry = await Entry.decode(bytes)
      if (entry) {
        const updated = await log.joinEntry(entry)
        if (updated) {
          if (onUpdate) {
            await onUpdate(log, entry)
          }
          events.emit('update', entry)
        }
      }
    }
    await queue.add(task)
  }

  /**
   * Closes the database, stopping sync and closing the oplog.
   * @memberof module:Databases~Database
   * @instance
   * @async
   */
  const close = async () => {
    await sync.stop()
    await queue.onIdle()
    await log.close()
    if (access && access.close) {
      await access.close()
    }
    events.emit('close')
  }

  /**
   * Drops the database, clearing the oplog.
   * @memberof module:Databases~Database
   * @instance
   * @async
   */
  const drop = async () => {
    await queue.onIdle()
    await log.clear()
    if (access && access.drop) {
      await access.drop()
    }
    events.emit('drop')
  }

  const sync = await Sync({
    ipfs,
    log,
    events,
    onSynced: applyOperation,
    start: syncAutomatically,
  })

  return {
    /**
     * The address of the database.
     * @†ype string
     * @memberof module:Databases~Database
     * @instance
     */
    address,
    /**
     * The name of the database.
     * @†ype string
     * @memberof module:Databases~Database
     * @instance
     */
    name,
    identity,
    meta,
    close,
    drop,
    addOperation,
    /**
     * The underlying [operations log]{@link module:Log~Log} of the database.
     * @†ype {module:Log~Log}
     * @memberof module:Databases~Database
     * @instance
     */
    log,
    /**
     * A [sync]{@link module:Sync~Sync} instance of the database.
     * @†ype {module:Sync~Sync}
     * @memberof module:Databases~Database
     * @instance
     */
    sync,
    /**
     * Set of currently connected peers for this Database instance.
     * @†ype Set
     * @memberof module:Databases~Database
     * @instance
     */
    peers: sync.peers,
    /**
     * Event emitter that emits Database changes. See Events section for details.
     * @†ype EventEmitter
     * @memberof module:Databases~Database
     * @instance
     */
    events,
    /**
     * The [access controller]{@link module:AccessControllers} instance of the database.
     * @memberof module:Databases~Database
     * @instance
     */
    access,
  }
}

export default Database
