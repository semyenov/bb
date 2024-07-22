/* eslint-disable no-unused-vars */
import * as crypto from '@libp2p/crypto'
import { compare as uint8ArrayCompare } from 'uint8arrays/compare'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

import { ComposedStorage, LRUStorage, LevelStorage } from './storage/index.js'

import type { StorageInstance } from './storage'
import type { PrivateKey, PublicKey } from './vendor'

export interface KeyStoreOptions {
  storage?: StorageInstance<Uint8Array>
  path?: string
}

export abstract class KeyStoreInstance {
  abstract createKey: (id: string) => Promise<PrivateKey<'secp256k1'>>

  abstract hasKey: (id: string) => Promise<boolean>
  abstract addKey: (id: string, key: PrivateKey<'secp256k1'>) => Promise<void>
  abstract removeKey: (id: string) => Promise<void>

  abstract getKey: (id: string) => Promise<PrivateKey<'secp256k1'> | null>
  abstract getPublic: (id: string) => Promise<PublicKey<'secp256k1'> | null>

  abstract clear: () => Promise<void>
  abstract close: () => Promise<void>
}

const DEFAULT_PATH = './keystore'
const VERIFIED_CACHE = LRUStorage<{ publicKey: string; data: string }>({
  size: 1000,
})

export const KeyStore = async (
  { storage, path }: { path: string; storage?: StorageInstance<Uint8Array> } = {
    path: DEFAULT_PATH,
  },
) => {
  const db: StorageInstance<Uint8Array> =
    storage ||
    (await ComposedStorage<Uint8Array>({
      storage1: await LRUStorage<Uint8Array>({ size: 1000 }),
      storage2: await LevelStorage<Uint8Array>({ path }),
    }))

  const keyStore: KeyStoreInstance = {
    clear: async () => {
      await db.clear()
    },
    close: async () => {
      await db.close()
    },
    hasKey: async (id) => {
      if (!id) {
        throw new Error('id needed to check a key')
      }

      let hasKey = false
      try {
        const storedKey = await db.get(`private_${id}`)
        hasKey = storedKey !== undefined && storedKey !== null
      } catch {
        // Catches 'Error: ENOENT: no such file or directory, open <path>'
        console.error('Error: ENOENT: no such file or directory')
      }

      return hasKey
    },
    addKey: async (id, key) => {
      await db.put(`private_${id}`, key)
    },
    createKey: async (id) => {
      if (!id) {
        throw new Error('id needed to create a key')
      }

      const keys = await crypto.keys.generateKeyPair('secp256k1')
      await db.put(`private_${id}`, keys.marshal())

      return keys
    },
    getKey: async (id) => {
      if (!id) {
        throw new Error('id needed to get a key')
      }

      const storedKey = await db.get(`private_${id}`)
      if (!storedKey) {
        return Promise.resolve(null)
      }

      return unmarshal(storedKey)
    },
    getPublic: async (id: string) => {
      const keys = await keyStore.getKey(id)
      if (!keys) {
        throw new Error('keys needed to get a public key')
      }

      return unmarshalPubKey(keys.public.bytes)
    },
    removeKey: async (id) => {
      if (!id) {
        throw new Error('id needed to remove a key')
      }

      await db.del(`private_${id}`)
    },
  }

  return keyStore
}

const unmarshal =
  crypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey
const unmarshalPubKey =
  crypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PublicKey

async function verify(publicKey: string, data: string, signature: string) {
  const pubKey = unmarshalPubKey(uint8ArrayFromString(publicKey, 'base16'))

  if (!pubKey) {
    throw new Error('Public key could not be decoded')
  }

  return pubKey.verify(
    uint8ArrayFromString(data, 'utf8'),
    uint8ArrayFromString(signature, 'base16'),
  )
}

async function verifySignature(
  signature: string,
  publicKey: string,
  data: string,
) {
  if (!signature) {
    throw new Error('No signature given')
  }
  if (!publicKey) {
    throw new Error('Given publicKey was undefined')
  }
  if (!data) {
    throw new Error('Given input data was undefined')
  }

  return verify(publicKey, data, signature)
}

export async function signMessage(
  key: PrivateKey,
  data: string | Uint8Array,
): Promise<string> {
  if (!key) {
    throw new Error('No signing key given')
  }

  if (!data) {
    throw new Error('Given input data was undefined')
  }

  const signature = await key.sign(
    typeof data === 'string'
      ? uint8ArrayFromString(data)
      : new Uint8Array(data),
  )
  return uint8ArrayToString(signature, 'base16')
}

export async function verifyMessage(
  signature: string,
  publicKey: string,
  data: string,
): Promise<boolean> {
  const verifiedCache = await VERIFIED_CACHE
  const cached = await verifiedCache.get(signature)
  if (!cached) {
    const verified = await verifySignature(signature, publicKey, data)
    if (verified) {
      await verifiedCache.put(signature, { publicKey, data })
    }

    return verified
  }

  const compare = (cached: Uint8Array, data: string | Uint8Array) => {
    return data instanceof Uint8Array
      ? uint8ArrayCompare(cached, data) === 0
      : cached.toString() === data
  }

  return (
    cached.publicKey === publicKey &&
    compare(uint8ArrayFromString(cached.data), data)
  )
}
