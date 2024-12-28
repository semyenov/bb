import type { KeyStoreInstance } from '@regioni/orbit'
import type {
  FlattenedJWSInput,
  JWK,
  JWSHeaderParameters,
  KeyLike,
} from 'jose'
import type { Storage } from 'unstorage'
import type { FSStorageOptions } from 'unstorage/drivers/fs'

import { secp256k1ToJWK } from '@regioni/lib-jose'
import { createLogger } from '@regioni/lib-logger'
import { KeyStore } from '@regioni/lib-orbit'
import {
  createLocalJWKSet,
} from 'jose'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'

import type { User } from './schema'

import {
  ErrorUserExists,
  ErrorUserKeyNotFound,
  ErrorUserNotFound,
} from './errors'

export interface UserStoreInstance {
  createUser: (id: string, data: Omit<User, 'jwk' | 'keys'>) => Promise<User>
  getJWKSet: () => Promise<
    (
      protectedHeader?: JWSHeaderParameters,
      token?: FlattenedJWSInput,
    ) => Promise<KeyLike>
  >

  getUser: (id: string) => Promise<User>
  keystore: KeyStoreInstance
  removeUser: (id: string) => Promise<void>
  storage: Storage<User>
  updateUser: (id: string, data: User) => Promise<User>
}

const logger = createLogger({
  defaultMeta: {
    label: 'store',
    service: 'users',
    version: '1.0.0',
  },
})

export class UsersStore implements UserStoreInstance {
  readonly keystore: KeyStoreInstance
  readonly storage: Storage<User>

  private constructor(
    keystore: KeyStoreInstance,
    storage: Storage<User>,
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

  async createUser(
    id: string,
    payload: Omit<User, 'jwk' | 'keys'>,
  ): Promise<User> {
    if (await this.storage.hasItem(id)) {
      throw ErrorUserExists
    }

    const key = await this.keystore.createKey(id)
    const kid = key.publicKey
      .toCID()
      .toString() || 'unknown'
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

  async getJWKSet(): Promise<(protectedHeader?: JWSHeaderParameters, token?: FlattenedJWSInput) => Promise<KeyLike>> {
    const keys: JWK[] = []
    for (const id of await this.storage.getKeys()) {
      const user = await this.storage.getItem(id)
      if (!user || !user.jwk) {
        continue
      }

      keys.push(user.jwk.publicKey)
    }

    return createLocalJWKSet({
      keys,
    })
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

  async removeUser(id: string): Promise<void> {
    const user = await this.storage.getItem(id)
    if (!user) {
      throw ErrorUserNotFound
    }
    else if (!user.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    await Promise.all(user.keys.map(
      (kid) => {
        return this.keystore.removeKey(kid)
      },
    ))

    await this.storage.removeItem(id)
  }

  async updateUser(
    id: string,
    payload: User,
  ): Promise<User> {
    const existingUser = await this.storage.getItem(id)
    if (!existingUser) {
      throw ErrorUserNotFound
    }
    else if (!existingUser.keys[0]) {
      throw ErrorUserKeyNotFound
    }

    const kid = existingUser.keys[0] || 'unknown'
    const key = await this.keystore.getKey(kid)
    if (!key) {
      throw ErrorUserKeyNotFound
    }

    const jwk = await secp256k1ToJWK(key)
    const user = Object.assign(
      Object.create(null),
      existingUser,
      payload,
      {
        jwk,
        keys: [kid],
      },
    )

    await this.storage.setItem(
      id,
      user,
    )

    return user
  }
}
