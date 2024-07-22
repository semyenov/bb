import { generateKeyPair, importKey } from '@libp2p/crypto/keys'
import { type CreateStorageOptions, createStorage } from 'unstorage'

import { ErrorKeyNotFound } from './errors'

import type { KeyStoreInstance } from '@orbitdb/core'

const PASSWORD = 'password'

export const KeyStore = async (
  options: CreateStorageOptions,
): Promise<KeyStoreInstance> => {
  const storage = createStorage<string>(options)
  const keyStore: KeyStoreInstance = {
    clear: () => storage.clear(),
    close: () => storage.dispose(),
    hasKey: (id) => storage.hasItem(id),
    createKey: () => generateKeyPair('secp256k1'),
    removeKey: (id: string) => storage.removeItem(id),
    async addKey(id, key) {
      const keyString = await key.export(PASSWORD, 'libp2p-key')
      await storage.setItem(id, keyString)
    },
    getPublic(keys) {
      return keys.public.marshal().toString()
    },
    async getKey(id) {
      const keyString = await storage.getItem(id)
      if (!keyString) {
        throw ErrorKeyNotFound
      }

      return importKey<'secp256k1'>(keyString, PASSWORD)
    },
  }

  return keyStore
}
