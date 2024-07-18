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
import { omit } from 'remeda'
import { createStorage } from 'unstorage'
import fsDriver, { type FSStorageOptions } from 'unstorage/drivers/fs'

import {
  ErrorUserExists,
  ErrorUserKeyNotFound,
  ErrorUserNotFound,
} from './errors'

import type { User } from './schema'
import type { KeyStoreInstance } from '@orbitdb/core'

export interface UserStoreOptions {}

export interface UserStoreInstance {
  keystore: KeyStoreInstance
  storage: ReturnType<typeof createStorage>

  getUser: (id: string) => Promise<{
    jwk: JWK
    user: User
  }>
  updateUser: (
    id: string,
    data: User,
  ) => Promise<{
    jwk: JWK
    user: User
  }>
  createUser: (
    id: string,
    data: User,
  ) => Promise<{
    jwk: JWK
    user: User
  }>
  removeUser: (id: string) => Promise<void>
  createJWKSet: () => Promise<
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
      ...options,
      base: `${options?.base}/users` || './.out/users',
    }),
  })
  const keystore = await KeyStore({
    ...options,
    base: `${options?.base}/keys` || './.out/keys',
  })

  const getUser = async (id: string) => {
    const user = await storage.getItem(id)
    if (!user) {
      throw ErrorUserNotFound
    } else if (!user.keys || !user.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    const kid = user.keys[0] || 'unknown'
    const key = await keystore.getKey(kid)
    const jwk = await secp256k1ToJWK(key)

    return { jwk, user }
  }

  const updateUser = async (id: string, user: User) => {
    const existingUser = await storage.getItem(id)
    if (!existingUser) {
      throw ErrorUserNotFound
    } else if (!existingUser.keys || !existingUser.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    const kid = existingUser.keys[0] || 'unknown'
    const key = await keystore.getKey(kid)
    const jwk = await secp256k1ToJWK(key)

    await storage.setItem(id, {
      ...user,
      keys: existingUser.keys.concat(user.keys || []),
    })

    return { jwk, user }
  }

  const createUser = async (id: string, user: User) => {
    if (await storage.hasItem(id)) {
      throw ErrorUserExists
    }

    const key = await keystore.createKey(id)
    const kid = (await key.id()) || 'unknown'

    await keystore.addKey(kid, key)
    await storage.setItem(id, { ...user, keys: [kid] })

    const jwk = await secp256k1ToJWK(key)

    logger.info('User created', { user })
    logger.debug('User jwk', { jwk })

    return { jwk, user }
  }

  const removeUser = async (id: string) => {
    const user = await storage.getItem(id)
    if (!user) {
      throw ErrorUserNotFound
    } else if (!user.keys || !user.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    await storage.removeItem(id)
    logger.debug('User deleted', { user })

    for (const kid of user.keys) {
      await keystore.removeKey(kid)
      logger.debug('User deleted with key', { kid })
    }
  }

  const getKeyset = async () => {
    const jwks: JWK[] = []

    for (const id of await storage.getKeys()) {
      const user = await storage.getItem(id)
      if (!user || !user.keys || !user.keys[0]) {
        continue
      }

      const kid = user.keys[0] || 'unknown'
      const key = await keystore.getKey(kid)

      const jwk = await secp256k1ToJWK(key)
      jwks.push(omit(jwk, ['d']))
    }

    return createLocalJWKSet({ keys: jwks })
  }

  return {
    keystore,
    storage,

    getUser,
    createUser,
    updateUser,
    removeUser,
    createJWKSet: getKeyset,
  }
}
