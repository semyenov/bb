import * as dagCbor from '@ipld/dag-cbor'
import { base58btc } from 'multiformats/bases/base58'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'

import type { AccessControllerInstance } from '.'
import type { IdentitiesInstance } from '../identities'
import type { EntryInstance } from '../oplog/entry'
import type { OrbitDBInstance } from '../orbitdb'
import type {
  StorageInstance,
} from '../storage'

import { ACCESS_CONTROLLER_IPFS_TYPE } from '../constants'
import {
  ComposedStorage,
  IPFSBlockStorage,
  LRUStorage,
} from '../storage'
import { join } from '../utils'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

async function AccessControlList({
  params,
  storage,
  type,
}: {
  type: string
  params: Record<string, any>
  storage: StorageInstance<Uint8Array>
}) {
  const manifest = { ...params, type }
  const { bytes, cid } = await Block.encode({ codec, hasher, value: manifest })
  const hash = cid.toString(hashStringEncoding)
  await storage.put(hash, bytes)

  return hash
}

export interface IPFSAccessControllerInstance extends AccessControllerInstance {
  address: string
  canAppend: (entry: EntryInstance) => Promise<boolean>
  type: string

  write: string[]
}

export class IPFSAccessController implements IPFSAccessControllerInstance {
  static get type(): 'ipfs' {
    return ACCESS_CONTROLLER_IPFS_TYPE
  }

  public address: string

  identities: IdentitiesInstance

  orbitdb: OrbitDBInstance

  storage: StorageInstance<Uint8Array>
  public write: string[]
  get type(): 'ipfs' {
    return ACCESS_CONTROLLER_IPFS_TYPE
  }

  private constructor(options: {
    orbitdb: OrbitDBInstance
    identities: IdentitiesInstance
    address: string
    write: string[]
    storage: StorageInstance<Uint8Array>
  }) {
    this.orbitdb = options.orbitdb
    this.identities = options.identities
    this.address = options.address
    this.write = options.write
    this.storage = options.storage
  }

  static async create(options: {
    orbitdb: OrbitDBInstance
    identities: IdentitiesInstance
    address?: string
    write?: string[]
    storage?: StorageInstance<Uint8Array>
  }): Promise<IPFSAccessControllerInstance> {
    const { identities, orbitdb } = options
    const { identity: { id: identityId }, ipfs } = orbitdb

    const storage
      = options.storage
      || ComposedStorage.create({
        storage1: LRUStorage.create({ size: 1000 }),
        storage2: IPFSBlockStorage.create({
          ipfs,
          pin: true,
        }),
      })

    let { address, write } = options
    write ||= [identityId]

    if (address) {
      const manifestBytes = await storage.get(
        address.replaceAll('/ipfs/', ''),
      )

      if (!manifestBytes) {
        throw new Error('Manifest not found')
      }

      const { value } = await Block.decode<{ write: string[] }, 113, 18>({
        bytes: manifestBytes,
        codec,
        hasher,
      })

      // eslint-disable-next-line prefer-destructuring
      write = value.write
    }
    else {
      address = await AccessControlList({
        params: { write },
        storage,
        type: ACCESS_CONTROLLER_IPFS_TYPE,
      })

      address = join(
        '/',
        ACCESS_CONTROLLER_IPFS_TYPE,
        address,
      )
    }

    const controller = new IPFSAccessController({
      address,
      identities,
      orbitdb,
      storage,
      write,
    })

    return controller
  }

  async canAppend(entry: EntryInstance): Promise<boolean> {
    if (!entry.identity) {
      return false
    }

    const writerIdentity = await this.identities.getIdentity(entry.identity)
    if (!writerIdentity) {
      return false
    }

    const { id } = writerIdentity
    // Allow if the write access list contain the writer's id or is '*'
    if (this.write.includes(id) || this.write.includes('*')) {
      // Check that the identity is valid
      return this.identities.verifyIdentity(writerIdentity)
    }

    return false
  }
}
