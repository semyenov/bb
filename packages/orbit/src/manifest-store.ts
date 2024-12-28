import * as dagCbor from '@ipld/dag-cbor'
import { base58btc } from 'multiformats/bases/base58'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'

import type { DatabaseTypeMap } from './databases'
import type { OrbitDBHeliaInstance } from './vendor.d'

import {
  ComposedStorage,
  IPFSBlockStorage,
  LRUStorage,
  type StorageInstance,
} from './storage'

export interface Manifest {
  accessController: string
  meta?: any
  name: string
  type: keyof DatabaseTypeMap
}

export interface ManifestStoreOptions {
  ipfs: OrbitDBHeliaInstance
  storage?: StorageInstance<Uint8Array>
}

export interface ManifestStoreInstance {
  close: () => Promise<void>
  create: (manifest: Manifest) => Promise<{ hash: string, manifest: Manifest }>
  get: (address: string) => Promise<Manifest | null>
}

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

export class ManifestStore implements ManifestStoreInstance {
  private storage: StorageInstance<Uint8Array>

  private constructor(storage: StorageInstance<Uint8Array>) {
    this.storage = storage
  }

  static create({ ipfs, storage }: ManifestStoreOptions): ManifestStore {
    const storage_
      = storage
      || ComposedStorage.create<Uint8Array>({
        storage1: LRUStorage.create({ size: 1000 }),
        storage2: IPFSBlockStorage.create({ ipfs, pin: true }),
      })

    return new ManifestStore(storage_)
  }

  async close(): Promise<void> {
    await this.storage.close()
  }

  async create({
    accessController,
    meta,
    name,
    type,
  }: Manifest): Promise<{ hash: string, manifest: Manifest }> {
    if (!name) {
      throw new Error('name is required')
    }
    if (!type) {
      throw new Error('type is required')
    }
    if (!accessController) {
      throw new Error('accessController is required')
    }

    const manifest = Object.assign(
      {
        accessController,
        name,
        type,
      },
      // meta field is only added to manifest if meta parameter is defined
      meta !== undefined ? { meta } : {},
    )

    const { bytes, cid } = await Block.encode({
      codec,
      hasher,
      value: manifest,
    })

    const hash = cid.toString(hashStringEncoding)
    await this.storage.put(hash, bytes)

    return {
      hash,
      manifest,
    }
  }

  async get(address: string): Promise<Manifest | null> {
    const bytes = await this.storage.get(address)
    if (!bytes) {
      return null
    }

    const { value } = await Block.decode<Manifest, 113, 18>({
      bytes,
      codec,
      hasher,
    })

    return value
  }
}
