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
  type?: D
  meta?: any
  address?: string
  referencesCount?: number
  syncAutomatically?: boolean

  Database?: (...args: any[]) => DatabaseTypeMap<T>[D]
  AccessController?: (
    ...args: any[]
  ) => Promise<AccessControllerTypeMap[keyof AccessControllerTypeMap]>

  headsStorage?: StorageInstance<Uint8Array>
  entryStorage?: StorageInstance<Uint8Array>
  indexStorage?: StorageInstance<boolean>
}

export interface OrbitDBOptions {
  ipfs: OrbitDBHeliaInstance
  identity?: IdentityInstance
  identities?: IdentitiesInstance
  dir?: string
  id?: string
}

export interface OrbitDBInstance {
  id: string
  dir: string
  ipfs: OrbitDBHeliaInstance
  keystore: KeyStoreInstance
  identity: IdentityInstance
  peerId: PeerId

  open: <T, D extends keyof DatabaseTypeMap>(
    type: D,
    address: string,
    options?: OrbitDBOpenOptions<T, D>,
  ) => Promise<DatabaseTypeMap<T>[D]>
  stop: () => Promise<void>
}

const DEFAULT_ACCESS_CONTROLLER = IPFSAccessController.create

export class OrbitDB implements OrbitDBInstance {
  public id: string
  public dir: string
  public ipfs: OrbitDBHeliaInstance
  public keystore: KeyStoreInstance
  public identity: IdentityInstance
  public peerId: PeerId

  private identities: IdentitiesInstance
  private manifestStore: ManifestStore
  private databases: Record<
    string,
    DatabaseTypeMap<any>[keyof DatabaseTypeMap<any>]
  > = {}

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
      ipfs,
      id = await createId(),
      dir = './.orbitdb',
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
        if (typeof identity.provider) {
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
      syncAutomatically,
      headsStorage,
      entryStorage,
      indexStorage,
      referencesCount,
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
        orbitdb: this,
        identities: this.identities,
        address: manifest.accessController,
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
        orbitdb: this,
        identities: this.identities,
      })

      if (!accessController.address) {
        throw new Error(
          'Access controller address is required',
        )
      }

      const m = await this.manifestStore.create({
        name: address_,
        type: type_,
        accessController: accessController.address!,
        meta,
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
      ipfs: this.ipfs,
      identity: this.identity,
      address: address_,
      name,
      meta,
      accessController,
      dir: this.dir,
      syncAutomatically,
      headsStorage,
      entryStorage,
      indexStorage,
      referencesCount,
    }) as DatabaseTypeMap<T>[typeof type]

    database.events.addEventListener(
      'close',
      this.onDatabaseClosed(address_),
    )

    this.databases[address_] = database

    return database
  }

  private onDatabaseClosed = (address: string) => {
    return (): void => {
      delete this.databases[address!]
    }
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
}

export const createOrbitDB = OrbitDB.create
