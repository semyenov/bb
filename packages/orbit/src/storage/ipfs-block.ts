import type { OrbitDBHeliaInstance } from '../vendor'
import type { StorageInstance } from './types'

import drain from 'it-drain'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { TimeoutController } from 'timeout-abort-controller'
import { STORAGE_IPFS_BLOCKSTORAGE_TIMEOUT } from '../constants'

export interface IPFSBlockStorageOptions {
  ipfs: OrbitDBHeliaInstance
  pin?: boolean
  timeout?: number
}

export class IPFSBlockStorage<T extends Uint8Array> implements StorageInstance<T> {
  private ipfs: OrbitDBHeliaInstance
  private readonly pin: boolean
  private readonly timeout: number

  private constructor(options: IPFSBlockStorageOptions) {
    if (!options.ipfs) {
      throw new Error('An instance of ipfs is required.')
    }
    this.ipfs = options.ipfs
    this.pin = options.pin || false
    this.timeout = options.timeout || STORAGE_IPFS_BLOCKSTORAGE_TIMEOUT
  }

  static create<T extends Uint8Array>(
    options: IPFSBlockStorageOptions,
  ): IPFSBlockStorage<T> {
    return new IPFSBlockStorage<T>(options)
  }

  async put(hash: string, data: T): Promise<void> {
    const cid = CID.parse(hash, base58btc)
    const { signal } = new TimeoutController(this.timeout)

    await this.ipfs.blockstore.put(cid, data, { signal })
    if (this.pin && !(await this.ipfs.pins.isPinned(cid))) {
      drain(this.ipfs.pins.add(cid))
    }
  }

  async get(hash: string): Promise<T | null> {
    const cid = CID.parse(hash, base58btc)
    const { signal } = new TimeoutController(this.timeout)
    const block = await this.ipfs.blockstore.get(cid, { signal })

    return (block || null) as T | null
  }

  async del(_hash: string): Promise<void> {
    // No-op for IPFS Block Storage
  }

  async *iterator(): AsyncIterableIterator<[string, T]> {
    // No-op for IPFS Block Storage
  }

  async merge(): Promise<void> {
    // No-op for IPFS Block Storage
  }

  async clear(): Promise<void> {
    // No-op for IPFS Block Storage
  }

  async close(): Promise<void> {
    // No-op for IPFS Block Storage
  }
}
