import type { KeyStoreInstance } from '../key-store'
import type { StorageInstance } from '../storage'
import type { OrbitDBHeliaInstance } from '../vendor.d'
import type { IdentityInstance } from './identity'
import type { IdentityProviderInstance } from './providers'

import { toString as uint8ArrayToString } from 'uint8arrays'
import { KeyStore, signMessage, verifyMessage } from '../key-store'
import { ComposedStorage, IPFSBlockStorage, LRUStorage } from '../storage'
import { join } from '../utils'
import { Identity } from './identity'
import { IdentityProviderRegistry as IdentityProviders } from './providers/registry'

interface IdentitiesCreateIdentityOptions {
  id?: string
  provider?: IdentityProviderInstance
}

export interface IdentitiesOptions {
  path?: string
  ipfs?: OrbitDBHeliaInstance
  keystore?: KeyStoreInstance
  storage?: StorageInstance<Uint8Array>
}

export interface IdentitiesInstance {
  keystore: KeyStoreInstance

  createIdentity: (options?: IdentitiesCreateIdentityOptions) => Promise<IdentityInstance>
  getIdentity: (id: string) => Promise<IdentityInstance | null>
  verifyIdentity: (identity: IdentityInstance) => Promise<boolean>
  sign: (identity: IdentityInstance, data: string) => Promise<string>
  verify: (signature: string, publickey: string, data: string) => Promise<boolean>
}

const DEFAULT_KEYS_PATH = join('./orbitdb', 'identities')

export class Identities implements IdentitiesInstance {
  keystore: KeyStoreInstance
  private storage: StorageInstance<Uint8Array>
  private cache: LRUStorage<
    Omit<IdentityInstance, 'getKey' | 'sign' | 'verify' | 'provider'>
  >

  private constructor(options: {
    keystore: KeyStoreInstance
    storage: StorageInstance<Uint8Array>
    cache: LRUStorage<
      Omit<IdentityInstance, 'getKey' | 'sign' | 'verify' | 'provider'>
    >
  }) {
    this.keystore = options.keystore
    this.storage = options.storage
    this.cache = options.cache
  }

  static async create(
    options: IdentitiesOptions = { path: DEFAULT_KEYS_PATH },
  ): Promise<Identities> {
    const keystore
      = options.keystore
      || (await KeyStore.create({ path: options.path || DEFAULT_KEYS_PATH }))

    const storage: StorageInstance<Uint8Array> = options.storage
      ? options.storage
      : ComposedStorage.create({
          storage1: await LRUStorage.create<Uint8Array>({ size: 1000 }),
          storage2: await IPFSBlockStorage.create({
            ipfs: options.ipfs!,
            pin: true,
          }),
        })

    const cache = await LRUStorage.create<
      Omit<IdentityInstance, 'getKey' | 'sign' | 'verify' | 'provider'>
    >({
      size: 1000,
    })

    return new Identities({
      keystore,
      storage,
      cache,
    })
  }

  async createIdentity(
    options: IdentitiesCreateIdentityOptions = {},
  ): Promise<IdentityInstance> {
    const {
      id,
      provider = { type: 'publickey' },
    } = options

    if (!id) {
      throw new Error('Identity id is required')
    }

    const IdentityProvider = IdentityProviders.getIdentityProvider(provider.type)
    if (!IdentityProvider) {
      throw new Error(
        `Identity provider type '${provider.type}' is not supported`,
      )
    }

    const identityProvider: IdentityProviderInstance
      = IdentityProvider({
        keystore: this.keystore,
      })
    const identityId = await identityProvider.getId({ id })

    const privateKey
      = await this.keystore.getKey(identityId)
      || await this.keystore.createKey(identityId)

    const identityIdSignature = await signMessage(
      privateKey,
      identityId,
    )
    const publicKey = uint8ArrayToString(
      privateKey.publicKey.raw,
      'base16',
    )
    const publicKeyAndIdSignature = await identityProvider.signIdentity(
      publicKey + identityIdSignature,
      { id },
    )
    const signatures = {
      id: identityIdSignature,
      publicKey: publicKeyAndIdSignature,
    }

    const identity = await Identity.create({
      id,
      publicKey,
      signatures,
      type: identityProvider.type,
      provider: identityProvider,
      verify: verifyFactory(),
      sign: signFactory(
        this.keystore,
        identityId,
      ),
    })

    const {
      hash,
      bytes: data,
    } = identity

    await this.storage.put(
      hash,
      data,
    )

    return identity
  }

  async verifyIdentity(identity: IdentityInstance): Promise<boolean> {
    if (!Identity.isIdentity(identity)) {
      return false
    }

    const {
      id,
      publicKey,
      provider,
      signatures: {
        id: signatureId,
      },
    } = identity

    if (!await verifyMessage(
      signatureId,
      publicKey,
      id,
    )) {
      return false
    }

    const cached = await this.cache.get(id)
    if (cached) {
      return Identity.isEqual(identity, await Identity.create({
        ...cached,
        sign: signFactory(this.keystore, id),
        verify: verifyFactory(),
        provider,
      }))
    }

    const identityVerified = await identity.verifyIdentity()
    if (identityVerified) {
      await this.cache.put(
        id,
        identity,
      )
    }

    return identityVerified
  }

  async getIdentity(hash: string): Promise<IdentityInstance | null> {
    const bytes = await this.storage.get(hash)
    if (bytes) {
      return await Identity.decode(bytes)
    }

    return null
  }

  async sign(identity: IdentityInstance, data: string | Uint8Array): Promise<string> {
    const privateKey = await this.keystore.getKey(identity.id)
    if (!privateKey) {
      throw new Error('Private signing key not found from KeyStore')
    }

    return signMessage(privateKey, data)
  }

  async verify(
    signature: string,
    publicKey: string,
    data: string | Uint8Array,
  ): Promise<boolean> {
    return verifyMessage(signature, publicKey, data)
  }
}

function signFactory(keystore: KeyStoreInstance, id: string) {
  return async (data: string | Uint8Array): Promise<string> => {
    const privateKey = await keystore.getKey(id)
    if (!privateKey) {
      throw new Error('Private signing key not found from KeyStore')
    }

    return signMessage(privateKey, data)
  }
}

function verifyFactory() {
  return async (
    signature: string,
    publicKey: string,
    data: string | Uint8Array,
  ): Promise<boolean> => {
    return verifyMessage(signature, publicKey, data)
  }
}
