/**
 * @namespace Storage-IPFS
 * @memberof module:Storage
 * @description
 * IPFSBlockStorage uses IPFS to store data as raw blocks.
 */
import drain from 'it-drain'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { TimeoutController } from 'timeout-abort-controller'

import type { StorageInstance } from './types'

export interface IPFSBlockStorageOptions {
  ipfs: any
  pin?: boolean
  timeout?: number
}
export interface IPFSBlockStorageInstance<T> extends StorageInstance<T> {}

const DEFAULT_TIMEOUT = 30000 // 30 seconds

export const IPFSBlockStorage = async <T = unknown>({
  ipfs,
  pin,
  timeout = DEFAULT_TIMEOUT,
}: IPFSBlockStorageOptions): Promise<IPFSBlockStorageInstance<T>> => {
  if (!ipfs) {
    throw new Error('An instance of ipfs is required.')
  }

  const storage: IPFSBlockStorageInstance<T> = {
    put: async (hash: string, data: any) => {
      const cid = CID.parse(hash, base58btc)
      const { signal } = new TimeoutController(timeout)

      await ipfs.blockstore.put(cid, data, { signal })
      if (pin && !(await ipfs.pins.isPinned(cid))) {
        drain(ipfs.pins.add(cid))
      }
    },
    del: async () => {},
    get: async (hash: string) => {
      const cid = CID.parse(hash, base58btc)
      const { signal } = new TimeoutController(timeout || DEFAULT_TIMEOUT)
      const block = await ipfs.blockstore.get(cid, { signal })
      if (block) {
        return block
      }
    },
    async *iterator() {},
    merge: async () => {},
    clear: async () => {},
    close: async () => {},
  }

  return storage
}
