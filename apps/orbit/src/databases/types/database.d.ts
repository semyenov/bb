/* eslint-disable no-unused-vars */

import type { AccessControllerInstance } from './access-controller'
import type { DatabaseEvents } from './events'
import type { IdentityInstance } from './identities'
import type { Entry, LogInstance } from './log'
import type { StorageInstance } from './storage'
import type { IdentitiesInstance } from '../../identities/types'
import type { HeliaInstance, PeerId } from '../../vendor'

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
  headsStorage?: StorageInstance
  entryStorage?: StorageInstance
  indexStorage?: StorageInstance
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
