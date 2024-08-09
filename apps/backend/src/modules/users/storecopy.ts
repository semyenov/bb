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
import type { Storage } from 'unstorage'

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

export class UsersStore implements UserStoreInstance {
  private constructor(
    public readonly keystore: KeyStoreInstance,
    public readonly storage: Storage<User>,
  ) {
    this.storage = storage
    this.keystore = keystore
  }

  static async create(options?: FSStorageOptions): Promise<UsersStore> {
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

    return new UsersStore(keystore, storage)
  }

  async getUser(id: string): Promise<User> {
    const user = await this.storage.getItem(id)
    if (!user) {
      throw ErrorUserNotFound
    }
    else if (!user.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    return user
  }

  async createUser(id: string, payload: Omit<User, 'keys' | 'jwk'>): Promise<User> {
    if (await this.storage.hasItem(id)) {
      throw ErrorUserExists
    }

    const key = await this.keystore.createKey(id)
    const kid = (await key.id()) || 'unknown'
    const jwk = await secp256k1ToJWK(key)
    const user = Object.assign(Object.create(null), payload, {
      jwk,
      keys: [kid],
    })

    await this.keystore.addKey(kid, key)
    await this.storage.setItem(id, user)

    logger.info('User created', { user })

    return user
  }

  async updateUser(id: string, payload: User): Promise<User> {
    const existingUser = await this.storage.getItem(id)
    if (!existingUser) {
      throw ErrorUserNotFound
    }
    else if (!existingUser.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    const kid = existingUser.keys[0] || 'unknown'
    const key = await this.keystore.getKey(kid)
    const jwk = await secp256k1ToJWK(key)
    const user = Object.assign(Object.create(null), existingUser, payload, {
      jwk,
      keys: [kid],
    })

    await this.storage.setItem(id, user)

    return user
  }

  async removeUser(id: string): Promise<void> {
    const user = await this.storage.getItem(id)
    if (!user) {
      throw ErrorUserNotFound
    }
    else if (!user.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    for (const kid of user.keys) {
      await this.keystore.removeKey(kid)
      logger.debug('Key deleted', { userId: user.id, kid })
    }

    await this.storage.removeItem(id)
    logger.debug('User deleted', { user })
  }

  async getJWKSet(): Promise<(protectedHeader?: JWSHeaderParameters, token?: FlattenedJWSInput) => Promise<KeyLike>> {
    const keys: JWK[] = []
    for (const id of await this.storage.getKeys()) {
      const user = await this.storage.getItem(id)
      if (!user || !user.jwk) {
        continue
      }

      keys.push(user.jwk.publicKey)
    }

    return createLocalJWKSet({ keys })
  }
}
