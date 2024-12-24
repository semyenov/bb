import type { KeyStoreInstance, Secp256k1PrivateKey } from '@regioni/orbit'
import type { CreateStorageOptions } from 'unstorage'

import {
  generateKeyPair,
  privateKeyFromRaw,
} from '@libp2p/crypto/keys'
import {
  fromString as uint8ArrayFromString,
  toString as uint8ArrayToString,
} from 'uint8arrays'
import { createStorage } from 'unstorage'
import { ErrorKeyNotFound } from './errors'

export async function KeyStore(options: CreateStorageOptions): Promise<KeyStoreInstance> {
  const storage = createStorage<string>(options)
  const keyStore: KeyStoreInstance = {
    clear: () => {
      return storage.clear()
    },
    close: () => {
      return storage.dispose()
    },
    hasKey: (id) => {
      return storage.hasItem(id)
    },
    createKey: () => {
      return generateKeyPair('secp256k1')
    },
    removeKey: (id: string) => {
      return storage.removeItem(id)
    },
    async addKey(id, key) {
      const keyString = uint8ArrayToString(key.raw)
      await storage.setItem(id, keyString)
    },
    async getKey(id) {
      const keyString = await storage.getItem(id)
      if (!keyString) {
        throw ErrorKeyNotFound
      }

      return privateKeyFromRaw(uint8ArrayFromString(keyString)) as Secp256k1PrivateKey
    },
  }

  return keyStore
}
