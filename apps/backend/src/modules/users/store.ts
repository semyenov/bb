import type { KeyStoreInstance } from '@regioni/orbit'
import type { StorageInstance } from 'unstorage'
import type { User } from './schema'
import { secp256k1ToJWK } from '@regioni/lib-jose'

import { createLogger } from '@regioni/lib-logger'
import { KeyStore } from '@regioni/orbit'
import {
  createLocalJWKSet,
  type FlattenedJWSInput,
  type JWK,
  type JWSHeaderParameters,
  type KeyLike,
} from 'jose'
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString } from 'uint8arrays'

import { createStorage } from 'unstorage'

import fsDriver, { type FSStorageOptions } from 'unstorage/drivers/fs'
import {
  ErrorUserExists,
  ErrorUserKeyNotFound,
  ErrorUserNotFound,
} from './errors'

export interface UserStoreInstance {
  keystore: KeyStoreInstance
  storage: ReturnType<typeof createStorage>

  getUser: (id: string) => Promise<User>
  createUser: (id: string, data: Omit<User, 'keys' | 'jwk'>) => Promise<User>
  updateUser: (id: string, data: User) => Promise<User>
  removeUser: (id: string) => Promise<void>
  getJWKSet: () => Promise<
    (
      protectedHeader?: JWSHeaderParameters,
      token?: FlattenedJWSInput,
    ) => Promise<KeyLike>
  >
}

const logger = createLogger({
  defaultMeta: {
    service: 'users',
    label: 'store',
  },
})

export async function UsersStore(
  options?: FSStorageOptions,
): Promise<UserStoreInstance> {
  const storage = createStorage<Uint8Array>({
    driver: fsDriver({
      base: `${options?.base}/users` || './.out/users',
      ...options,
    }),
  })

  const s: StorageInstance<Uint8Array> = {
    get: async (id: string) => {
      return await storage.getItem(id)
    },
    put: async (id: string, value: User) => {
      const data = uint8ArrayFromString(JSON.stringify(value))

      return await storage.setItem(id, data)
    },
    del: async (id: string) => {
      return await storage.removeItem(id)
    },
    has: async (id: string) => {
      return await storage.hasItem(id)
    },
    keys: async () => {
      return await storage.getKeys()
    },
    merge: async (id: string, value: User) => {
      const data = uint8ArrayFromString(JSON.stringify(value))

      return await storage.setItem(id, data)
    },
    close: async () => {
      return await storage.dispose()
    },
  }

  const keystore = await KeyStore.create({
    path: './.out/keys',
    storage: s,
  })

  const getUser = async (id: string) => {
    const user = await s.get(id)
    if (!user) {
      throw ErrorUserNotFound
    }
    else if (!user.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    // const kid = user.keys[0] || 'unknown'
    // const key = await keystore.getKey(kid)
    // const jwk = await secp256k1ToJWK(key)

    return user
  }

  const createUser = async (
    id: string,
    payload: Omit<User, 'keys' | 'jwk'>,
  ) => {
    if (await s.has(id)) {
      throw ErrorUserExists
    }

    const key = await keystore.createKey(id)
    const kid = (key.publicKey.toCID()
      .toString()) || 'unknown'
    const jwk = await secp256k1ToJWK(key)

    const user = Object.assign(
      Object.create(null),
      payload,
      {
        jwk,
        keys: [kid],
      },
    )

    await keystore.addKey(kid, key)
    await s.put(id, user)

    logger.info('User created', { user })

    return user
  }

  const updateUser = async (id: string, payload: User) => {
    const existingUser = await s.get(id)
    if (!existingUser) {
      throw ErrorUserNotFound
    }
    else if (!existingUser.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    const kid = existingUser.keys[0] || 'unknown'
    const key = await keystore.getKey(kid)
    const jwk = await secp256k1ToJWK(key)
    const user = Object.assign(Object.create(null), existingUser, payload, {
      jwk,
      keys: [kid],
    })

    await s.put(id, user)

    return user
  }

  const removeUser = async (id: string) => {
    const user = await s.get(id)
    if (!user) {
      throw ErrorUserNotFound
    }
    else if (!user.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    for (const kid of user.keys) {
      await keystore.removeKey(kid)
      logger.debug('Key deleted', { userId: user.id, kid })
    }

    await s.del(id)
    logger.debug('User deleted', { user })
  }

  const getJWKSet = async () => {
    const keys: JWK[] = []
    for (const id of await s.keys()) {
      const user = await s.get(id)
      if (!user || !user.jwk) {
        continue
      }

      keys.push(user.jwk.publicKey)
    }

    return createLocalJWKSet({ keys })
  }

  return {
    keystore,
    storage: s,

    getUser,
    createUser,
    updateUser,
    removeUser,
    getJWKSet,
  }
}
