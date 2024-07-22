/* eslint-disable no-unused-vars */
/**
 * @module Identities
 * @description
 * Identities provides a framework for generating and managing identity
 * details and providers.
 */
// import DIDIdentityProvider from './identity-providers/did.js'
// import EthIdentityProvider from './identity-providers/ethereum.js'
import KeyStore, {
  type KeyStoreInstance,
  signMessage,
  verifyMessage,
} from '../key-store.js'
import {
  ComposedStorage,
  IPFSBlockStorage,
  LRUStorage,
  type StorageInstance,
} from '../storage/index.js'
import pathJoin from '../utils/path-join.js'

import {
  Identity,
  type IdentityInstance,
  decodeIdentity,
  isEqual,
  isIdentity,
} from './identity.js'
import { getIdentityProvider } from './providers/index.js'

import type { IdentityProviderInstance } from './types.js'
import type { HeliaInstance } from '../vendor.js'

interface IdentitiesCreateIdentityOptions {
  id?: string
  provider?: IdentityProviderInstance
}
export interface IdentitiesOptions {
  path?: string

  ipfs?: HeliaInstance
  keystore?: KeyStoreInstance
  storage?: StorageInstance<Uint8Array>
}

export interface IdentitiesInstance {
  createIdentity: (
    options?: IdentitiesCreateIdentityOptions,
  ) => Promise<IdentityInstance>
  getIdentity: (id: string) => Promise<IdentityInstance>
  verifyIdentity: (identity: IdentityInstance) => Promise<boolean>
  keystore: KeyStoreInstance
  sign: (
    identity: IdentityInstance,
    data: string | Uint8Array,
  ) => Promise<string>
  verify: (
    signature: string,
    publickey: string,
    data: string | Uint8Array,
  ) => Promise<boolean>
}

const DEFAULT_KEYS_PATH = pathJoin('./orbitdb', 'identities')

export const Identities = async (
  { keystore, path, storage, ipfs }: IdentitiesOptions = {
    path: DEFAULT_KEYS_PATH,
  },
) => {
  /**
   * @namespace module:Identities~Identities
   * @description The instance returned by {@link module:Identities}.
   */

  const keys = keystore || (await KeyStore({ path: path || DEFAULT_KEYS_PATH }))

  const db = storage
    ? storage
    : await ComposedStorage({
        storage1: await LRUStorage({ size: 1000 }),
        storage2: await IPFSBlockStorage({ ipfs, pin: true }),
      })

  const verifiedIdentitiesCache = await LRUStorage({ size: 1000 })

  const identities: IdentitiesInstance = {
    keystore: keys,

    createIdentity: async (options = {}) => {
      options.keystore = keys
      const DefaultIdentityProvider = getIdentityProvider('publickey')
      const identityProviderInit =
        options.provider || DefaultIdentityProvider({ keystore: keys })

      const identityProvider = await identityProviderInit()

      if (!getIdentityProvider(identityProvider.type)) {
        throw new Error(
          'Identity provider is unknown. Use useIdentityProvider(provider) to register the identity provider',
        )
      }

      const id = await identityProvider.getId(options)
      const privateKey = (await keys.getKey(id)) || (await keys.createKey(id))
      const publicKey = keys.getPublic(privateKey)
      const idSignature = await signMessage(privateKey, id)
      const publicKeyAndIdSignature = await identityProvider.signIdentity(
        publicKey + idSignature,
        options,
      )
      const signatures = {
        id: idSignature,
        publicKey: publicKeyAndIdSignature,
      }

      const identity = await Identity({
        id,
        publicKey,
        signatures,
        type: identityProvider.type,
        sign: async (identity, data) => {
          const signingKey = await keys.getKey(identity.id)

          if (!signingKey) {
            throw new Error('Private signing key not found from KeyStore')
          }

          return await signMessage(signingKey, data)
        },
        verify: async (signature, publicKey, data) => {
          return await verifyMessage(signature, publicKey, data)
        },
      })

      await db.put(identity.hash, identity.bytes)

      return identity
    },
    verifyIdentity: async (identity) => {
      if (!isIdentity(identity)) {
        return false
      }

      const { id, publicKey, signatures } = identity

      const idSignatureVerified = await (async (signature, publicKey, data) => {
        return await verifyMessage(signature, publicKey, data)
      })(signatures.id, publicKey, id)
      if (!idSignatureVerified) {
        return false
      }

      const verifiedIdentity = await verifiedIdentitiesCache.get(signatures.id)
      if (verifiedIdentity) {
        return isEqual(identity, verifiedIdentity)
      }

      const Provider = getIdentityProvider(identity.type)

      const identityVerified = await Provider.verifyIdentity(identity)
      if (identityVerified) {
        await verifiedIdentitiesCache.put(signatures.id, identity)
      }

      return identityVerified
    },
    getIdentity: async (hash) => {
      const bytes = await db.get(hash)
      if (bytes) {
        return decodeIdentity(bytes)
      }
    },
    sign: async (identity, data) => {
      const signingKey = await keys.getKey(identity.id)

      if (!signingKey) {
        throw new Error('Private signing key not found from KeyStore')
      }

      return await signMessage(signingKey, data)
    },
    verify: async (signature, publicKey, data) => {
      return await verifyMessage(signature, publicKey, data)
    },
  }

  return identities
}
