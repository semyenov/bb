/* eslint-disable no-unused-vars */

import type { AccessControllerInstance } from './access-controller'
import type { IdentityInstance } from './identities'
import type { SyncInstance } from './sync'
import type { HeliaInstance, PeerId } from './vendor'
import type { IdentitiesInstance } from '../../identities/types'
import type { Entry, LogInstance } from '../../log'
import type { StorageInstance } from '../../storage'
import type { EventEmitter } from 'node:events'

export interface SyncEvents<T> extends EventEmitter {
  on: ((
    event: 'join',
    listener: (peerId: string, heads: Entry.Instance<T>[]) => void,
  ) => this) &
    ((event: 'leave', listener: (peerId: string) => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this)
}

export interface DatabaseEvents<T = unknown> extends EventEmitter {
  on: ((
    event: 'join',
    listener: (peerId: string, heads: Entry.Instance<T>[]) => void,
  ) => this) &
    ((event: 'leave', listener: (peerId: string) => void) => this) &
    ((event: 'close', listener: () => void) => this) &
    ((event: 'drop', listener: () => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this) &
    ((event: 'update', listener: (entry: Entry.Instance<T>) => void) => this)
}

interface DatabaseOptions<T> {
  meta?: any
  name?: string
  address?: string
  directory?: string
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
interface DatabaseInstance<T = unknown> {
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
declare function Database<T>(
  options: DatabaseOptions<T>,
): Promise<DatabaseInstance<T>>

export type { DatabaseInstance, DatabaseOptions }
export { Database }
