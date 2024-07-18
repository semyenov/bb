import { generateKeyPair, importKey } from '@libp2p/crypto/keys'
import { createStorage } from 'unstorage'
import fsDriver, { type FSStorageOptions } from 'unstorage/drivers/fs'

import type { KeyStoreInstance } from '@orbitdb/core'

const PASSWORD = 'password' // Константы обычно пишутся заглавными буквами

export function KeyStore(
  options?: FSStorageOptions,
): Promise<KeyStoreInstance> {
  const storage = createStorage<string>({
    driver: fsDriver(options),
  })

  const keyStore: KeyStoreInstance = {
    async addKey(id, key) {
      const keyString = await key.export(PASSWORD, 'libp2p-key')
      await storage.setItem(id, keyString)
    },
    clear: () => storage.clear(),
    close: () => storage.dispose(),
    createKey: () => generateKeyPair('secp256k1'),
    removeKey: (id: string) => storage.removeItem(id),
    async getKey(id) {
      const keyString = await storage.getItem(id)
      if (!keyString) {
        throw new Error('Ключ не найден')
      }
      return importKey<'secp256k1'>(keyString, PASSWORD)
    },
    getPublic(keys) {
      return keys.public.marshal().toString()
    },
    hasKey: (id) => storage.hasItem(id),
  }

  return Promise.resolve(keyStore)
}
