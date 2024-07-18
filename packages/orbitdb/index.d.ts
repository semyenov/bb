import type {
  AccessController,
  AccessControllerInstance,
} from './access-controller'
import type { DatabaseInstance } from './database'
import type { Databases, DatabasesTypeMap } from './databases'
import type { IdentitiesInstance, IdentityInstance } from './identities'
import type { KeyStoreInstance } from './key-store'
import type { StorageInstance } from './storage'
import type { IPFS, PeerId } from './vendor'

interface OrbitDBOpenOptions<D extends keyof DatabasesTypeMap> {
  type?: D
  meta?: any
  sync?: boolean
  referencesCount?: number

  Database?: Databases<keyof DatabasesTypeMap, DatabaseInstance>
  AccessController?: AccessController<string, AccessControllerInstance>

  headsStorage?: StorageInstance
  entryStorage?: StorageInstance
  indexStorage?: StorageInstance
}

interface OrbitDBOptions {
  id?: string
  ipfs: IPFS
  identity?: IdentityInstance
  identities?: IdentitiesInstance
  directory?: string
}

interface OrbitDBInstance {
  id: string
  ipfs: IPFS
  directory: string
  keystore: KeyStoreInstance
  identity: IdentityInstance
  peerId: PeerId

  open: <T, D extends keyof DatabasesTypeMap>(
    address: string,
    options?: OrbitDBOpenOptions<D>,
  ) => Promise<DatabasesTypeMap<T>[D]>
  stop: () => Promise<void>
}
declare function OrbitDB(options: OrbitDBOptions): Promise<OrbitDBInstance>

export type {
  OrbitDBInstance,
  OrbitDBOpenOptions,
  OrbitDBOptions as CreateOrbitDBOptions,
}
export { OrbitDB as createOrbitDB }

export type {
  KeyStoreInstance,
  PrivateKeys,
  Secp256k1PrivateKey,
} from './key-store'
export { KeyStore, signMessage, verifyMessage } from './key-store'

export type {
  AccessController,
  AccessControllerOptions,
  AccessControllerInstance,
  OrbitDBAccessControllerInstance,
} from './access-controller'
export {
  IPFSAccessController,
  OrbitDBAccessController,
  useAccessController,
} from './access-controller'

export type { DatabaseInstance, DatabaseOptions } from './database'
export { Database } from './database'

export type {
  DatabasesTypeMap as DatabaseTypeMap,
  DocumentsDoc,
  DocumentsInstance,
  EventsDoc,
  EventsInstance,
  KeyValueDoc,
  KeyValueIndexedInstance,
  KeyValueInstance,
} from './databases'
export {
  Documents,
  Events,
  KeyValue,
  KeyValueIndexed,
  useDatabaseType,
} from './databases'

export type {
  IdentitiesInstance,
  IdentityInstance,
  IdentityOptions,
  IdentityProvider,
  IdentityProviderInstance,
} from './identities'
export {
  decodeIdentity,
  getIdentityProvider,
  Identities,
  Identity,
  isEqual,
  isIdentity,
  PublicKeyIdentityProvider,
  useIdentityProvider,
} from './identities'

export { Entry, Log } from './log'

export type {
  StorageInstance,
  LevelStorageInstance,
  LevelStorageOptions,
} from './storage'
export {
  ComposedStorage,
  IPFSBlockStorage,
  LevelStorage,
  LRUStorage,
  MemoryStorage,
} from './storage'

export type { OrbitDBAddress } from './utils'
export { isValidAddress, parseAddress } from './utils'

export type { IPFS, PeerId } from './vendor'
