import type {
  AccessControllerInstance,
  AccessControllerTypeMap,
} from './access-controllers'
import type { DatabaseTypeMap } from './databases'
import type {
  IdentitiesInstance,
  IdentityInstance,
} from './identities'
import type { KeyStoreInstance } from './key-store'
import type { Manifest } from './manifest-store'
import type { StorageInstance } from './storage'
import type { OrbitDBHeliaInstance, PeerId } from './vendor.d'

import {
  getAccessController,
} from './access-controllers'
import { IPFSAccessController } from './access-controllers/ipfs'
import { OrbitDBAddress } from './address'
import { DATABASE_DEFAULT_TYPE } from './constants'
import { getDatabaseType } from './databases'
import {
  Identities,
} from './identities'
import { KeyStore } from './key-store'
import { ManifestStore } from './manifest-store'
import { createId, join } from './utils'

export interface OrbitDBOpenOptions<T, D extends keyof DatabaseTypeMap> {
  AccessController?: (
    ...args: any[]
  ) => Promise<AccessControllerTypeMap[keyof AccessControllerTypeMap]>
  address?: string
  Database?: (...args: any[]) => DatabaseTypeMap<T>[D]
  entryStorage?: StorageInstance<Uint8Array>
  headsStorage?: StorageInstance<Uint8Array>

  indexStorage?: StorageInstance<boolean>
  meta?: any

  referencesCount?: number
  syncAutomatically?: boolean
  type?: D
}

export interface OrbitDBOptions {
  dir?: string
  id?: string
  identities?: IdentitiesInstance
  identity?: IdentityInstance
  ipfs: OrbitDBHeliaInstance
}

export interface OrbitDBInstance {
  dir: string
  id: string
  identity: IdentityInstance
  ipfs: OrbitDBHeliaInstance
  keystore: KeyStoreInstance
  open: <T, D extends keyof DatabaseTypeMap>(
    type: D,
    address: string,
    options?: OrbitDBOpenOptions<T, D>,
  ) => Promise<DatabaseTypeMap<T>[D]>

  peerId: PeerId
  stop: () => Promise<void>
}

const DEFAULT_ACCESS_CONTROLLER = IPFSAccessController.create

export class OrbitDB implements OrbitDBInstance {
  public dir: string
  public id: string
  public identity: IdentityInstance
  public ipfs: OrbitDBHeliaInstance
  public keystore: KeyStoreInstance
  public peerId: PeerId

  private databases: Record<
    string,
    DatabaseTypeMap<any>[keyof DatabaseTypeMap<any>]
  > = {}

  private identities: IdentitiesInstance
  private manifestStore: ManifestStore

  private constructor(
    id: string,
    dir: string,
    ipfs: OrbitDBHeliaInstance,
    keystore: KeyStoreInstance,
    identity: IdentityInstance,
    identities: IdentitiesInstance,
    manifestStore: ManifestStore,
  ) {
    this.id = id
    this.ipfs = ipfs
    this.dir = dir
    this.keystore = keystore
    this.identity = identity
    this.peerId = ipfs.libp2p.peerId
    this.identities = identities
    this.manifestStore = manifestStore
  }

  static async create(options: OrbitDBOptions): Promise<OrbitDB> {
    if (options.ipfs === null) {
      throw new Error('IPFS instance is a required argument.')
    }

    const {
      dir = './orbitdb',
      id = await createId(),
      ipfs,
    } = options

    let keystore: KeyStoreInstance
    let { identities } = options

    if (identities) {
      ({ keystore } = identities)
    }
    else {
      keystore = await KeyStore.create({
        path: join(dir, './keystore'),
      })
      identities = await Identities.create({
        ipfs,
        keystore,
      })
    }

    const getIdentity = async (identity?: IdentityInstance) => {
      if (identity) {
        if (typeof identity.provider === 'function') {
          return identities.createIdentity({
            id: identity.id,
            provider: identity.provider,
          })
        }

        return identity
      }

      return identities.createIdentity({ id })
    }

    const identity = await getIdentity(options.identity)
    const manifestStore = ManifestStore.create({ ipfs })

    return new OrbitDB(
      id,
      dir,
      ipfs,
      keystore,
      identity,
      identities,
      manifestStore,
    )
  }

  async open<T, D extends keyof DatabaseTypeMap>(
    type: D = DATABASE_DEFAULT_TYPE as D,
    address: string,
    options: OrbitDBOpenOptions<T, D> = {},
  ): Promise<DatabaseTypeMap<T>[D]> {
    const {
      entryStorage,
      headsStorage,
      indexStorage,
      referencesCount,
      syncAutomatically,
    } = options

    let { meta } = options

    let type_: D = type
    let address_: string = address

    let name: string
    let manifest: Manifest | null
    let accessController: AccessControllerInstance

    if (this.databases[address_!]) {
      return this.databases[address_!] as DatabaseTypeMap<T>[D]
    }

    if (OrbitDBAddress.isValid(address_)) {
      const addr = OrbitDBAddress.create(address_)
      manifest = await this.manifestStore.get(addr.hash)
      if (!manifest) {
        throw new Error(`Manifest not found for address: ${address_}`)
      }

      const acType = manifest.accessController
        .split('/', 2)
        .pop()! as keyof AccessControllerTypeMap

      const AccessController = getAccessController(acType)
      if (!AccessController) {
        throw new Error(`Unsupported access controller type: '${acType}'`)
      }

      accessController = await AccessController({
        address: manifest.accessController,
        identities: this.identities,
        orbitdb: this,
      })

      // eslint-disable-next-line prefer-destructuring
      name = manifest.name
      meta ||= manifest.meta

      type_ = type || manifest.type
    }
    else {
      type_ = type || DATABASE_DEFAULT_TYPE

      const AccessController
        = options.AccessController || DEFAULT_ACCESS_CONTROLLER

      accessController = await AccessController({
        identities: this.identities,
        orbitdb: this,
      })

      const m = await this.manifestStore.create({
        accessController: accessController.address!,
        meta,
        name: address_,
        type: type_,
      })

      address_ = m.hash

      // eslint-disable-next-line prefer-destructuring
      manifest = m.manifest
      // eslint-disable-next-line prefer-destructuring
      name = manifest.name
      meta ||= manifest.meta

      if (this.databases[address_!] as DatabaseTypeMap<T>[D]) {
        return this.databases[address_!] as DatabaseTypeMap<T>[typeof type]
      }
    }

    const Database = options.Database || getDatabaseType(type_)
    if (!Database) {
      throw new Error(`Unsupported database type: '${type}'`)
    }

    const database = await Database({
      accessController,
      address: address_,
      dir: this.dir,
      entryStorage,
      headsStorage,
      identity: this.identity,
      indexStorage,
      ipfs: this.ipfs,
      meta,
      name,
      referencesCount,
      syncAutomatically,
    }) as DatabaseTypeMap<T>[typeof type]

    database.events.addEventListener('close', this.onDatabaseClosed(address_))

    this.databases[address_!] = database

    return database
  }

  async stop(): Promise<void> {
    for (const database of Object.values(this.databases)) {
      await database.close()
    }
    if (this.keystore) {
      await this.keystore.close()
    }
    if (this.manifestStore) {
      await this.manifestStore.close()
    }

    for (const key of Object.keys(this.databases)) {
      delete this.databases[key!]
    }
  }

  private onDatabaseClosed = (address: string) => {
    return (): void => {
      delete this.databases[address!]
    }
  }
}

export const createOrbitDB = OrbitDB.create
