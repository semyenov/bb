import type { KeyType } from '@libp2p/interface'
import type { KeyStoreInstance, Secp256k1PrivateKey } from '@regioni/orbit'
import type { CreateStorageOptions, Storage } from 'unstorage'

import { generateKeyPair, privateKeyFromRaw } from '@libp2p/crypto/keys'
import {
  fromString as uint8ArrayFromString,
  toString as uint8ArrayToString,
} from 'uint8arrays'
import { createStorage } from 'unstorage'

import { ErrorKeyNotFound } from '../errors'

export interface KeyStoreConfig {
  deserialize?: (str: string) => Promise<Secp256k1PrivateKey>
  keyType: KeyType
  serialize: (key: Secp256k1PrivateKey) => string
}

export abstract class BaseKeyStore implements KeyStoreInstance {
  protected config: KeyStoreConfig
  protected storage: Storage<string>

  constructor(options: CreateStorageOptions, config: KeyStoreConfig) {
    this.storage = createStorage<string>(options)
    this.config = {
      deserialize: async (str) => {
        return privateKeyFromRaw(
          uint8ArrayFromString(str),
        ) as Secp256k1PrivateKey
      },
      ...config,
    }
  }

  abstract addKey(id: string, key: Secp256k1PrivateKey): Promise<void>

  clear(): Promise<void> {
    return this.storage.clear()
  }

  close(): Promise<void> {
    return this.storage.dispose()
  }

  async createKey(): Promise<Secp256k1PrivateKey> {
    const key = await generateKeyPair(this.config.keyType || 'secp256k1')
    if (key.type !== this.config.keyType) {
      throw new Error('Key type mismatch')
    }

    return key as Secp256k1PrivateKey
  }

  abstract getKey(id: string): Promise<Secp256k1PrivateKey>

  hasKey(id: string): Promise<boolean> {
    return this.storage.hasItem(id)
  }

  removeKey(id: string): Promise<void> {
    return this.storage.removeItem(id)
  }
}

export class KeyStore extends BaseKeyStore {
  static async create(
    options: CreateStorageOptions,
    config: KeyStoreConfig = {
      keyType: 'secp256k1',
      serialize: (key) => {
        return uint8ArrayToString(key.raw)
      },
    },
  ): Promise<KeyStoreInstance> {
    return new KeyStore(options, config)
  }

  async addKey(id: string, key: Secp256k1PrivateKey): Promise<void> {
    const keyString = this.config.serialize?.(key)
    if (!keyString) {
      throw new Error('No serialize function provided')
    }

    await this.storage.setItem(id, keyString)
  }

  async getKey(id: string): Promise<Secp256k1PrivateKey> {
    const keyString = await this.storage.getItem(id)
    if (!keyString) {
      throw ErrorKeyNotFound
    }

    const key = await this.config.deserialize?.(keyString)
    if (!key) {
      throw new Error('No deserialize function provided')
    }

    return key
  }
}

export const stores = new Map<string, typeof KeyStore>()

export async function createKeyStoreFromFactory(
  type: string,
  options: CreateStorageOptions,
  config: KeyStoreConfig = {
    keyType: 'secp256k1',
    serialize: (key) => {
      return uint8ArrayToString(key.raw)
    },
  },
): Promise<KeyStoreInstance> {
  const Store = stores.get(type)
  if (!Store) {
    throw new Error(`Unknown key store type: ${type}`)
  }

  return Store.create(options, config)
}

export function registerKeyStore(type: string, store: typeof KeyStore): void {
  stores.set(type, store)
}

registerKeyStore('default', KeyStore)

export function createKeyStore(
  options: CreateStorageOptions,
  config: KeyStoreConfig = {
    keyType: 'secp256k1',
    serialize: (key) => {
      return uint8ArrayToString(key.raw)
    },
  },
  type = 'default',
): Promise<KeyStoreInstance> {
  return createKeyStoreFromFactory(type, options, config)
}
