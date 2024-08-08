import { secp256k1ToJWK } from '@regioni/lib-jose'
import { createLogger } from '@regioni/lib-logger'
import { KeyStore } from '@regioni/lib-orbit'
import {
  type FlattenedJWSInput,
  type JWK,
  type JWSHeaderParameters,
  type KeyLike,
  createLocalJWKSet,
} from 'jose'
import { createStorage } from 'unstorage'
import fsDriver, { type FSStorageOptions } from 'unstorage/drivers/fs'

import {
  ErrorUserExists,
  ErrorUserKeyNotFound,
  ErrorUserNotFound,
} from './errors'

import type { User } from './schema'
import type { KeyStoreInstance } from '@orbitdb/core'

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
  const storage = createStorage<User>({
    driver: fsDriver({
      base: `${options?.base}/users` || './.out/users',
      ...options,
    }),
  })
  const keystore = await KeyStore({
    driver: fsDriver({
      base: `${options?.base}/keys` || './.out/keys',
      ...options,
    }),
  })

  const getUser = async (id: string) => {
    const user = await storage.getItem(id)
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
    if (await storage.hasItem(id)) {
      throw ErrorUserExists
    }

    const key = await keystore.createKey(id)
    const kid = (await key.id()) || 'unknown'
    const jwk = await secp256k1ToJWK(key)
    const user = Object.assign(Object.create(null), payload, {
      jwk,
      keys: [kid],
    })

    await keystore.addKey(kid, key)
    await storage.setItem(id, user)

    logger.info('User created', { user })

    return user
  }

  const updateUser = async (id: string, payload: User) => {
    const existingUser = await storage.getItem(id)
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

    await storage.setItem(id, user)

    return user
  }

  const removeUser = async (id: string) => {
    const user = await storage.getItem(id)
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

    await storage.removeItem(id)
    logger.debug('User deleted', { user })
  }

  const getJWKSet = async () => {
    const keys: JWK[] = []
    for (const id of await storage.getKeys()) {
      const user = await storage.getItem(id)
      if (!user || !user.jwk) {
        continue
      }

      keys.push(user.jwk.publicKey)
    }

    return createLocalJWKSet({ keys })
  }

  return {
    keystore,
    storage,

    getUser,
    createUser,
    updateUser,
    removeUser,
    getJWKSet,
  }
}
