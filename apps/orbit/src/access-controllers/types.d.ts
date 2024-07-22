import type { DatabaseEvents } from './events'
import type { IdentitiesInstance, OrbitDBInstance } from './index'
import type { Entry } from './log'
import type { StorageInstance } from './storage'

interface CreateAccessControllerOptions {
  write?: string[]
  storage?: StorageInstance
}

interface AccessControllerOptions {
  orbitdb: OrbitDBInstance
  identities: IdentitiesInstance
  address?: string
}

interface AccessControllerInstance {
  canAppend: (entry: Entry.Instance) => Promise<boolean>
}

type AccessController<T extends string, U extends AccessControllerInstance> = {
  type: T
  (options: AccessControllerOptions): Promise<U>
}

interface IPFSAccessControllerInstance extends AccessControllerInstance {
  type: string
  address: string
  write: string[]
}
declare const IPFSAccessController: (
  options?: CreateAccessControllerOptions,
) => AccessController<'ipfs', IPFSAccessControllerInstance>

interface OrbitDBAccessControllerInstance extends AccessControllerInstance {
  events: DatabaseEvents

  close: () => Promise<void>
  drop: () => Promise<void>
  capabilities: () => Promise<string[]>
  get: (capability: string) => Promise<string[]>
  grant: (capability: string, key: string) => Promise<void>
  hasCapability: (capability: string, key: string) => Promise<boolean>
  revoke: (capability: string, key: string) => Promise<void>
}

declare const OrbitDBAccessController: (
  options?: CreateAccessControllerOptions,
) => AccessController<'orbitdb', OrbitDBAccessControllerInstance>

export type {
  AccessController,
  AccessControllerOptions,
  AccessControllerInstance,
  IPFSAccessControllerInstance,
  OrbitDBAccessControllerInstance,
}
export { IPFSAccessController, OrbitDBAccessController }

export function useAccessController(
  accessController: AccessController<string, AccessControllerInstance>,
): void
