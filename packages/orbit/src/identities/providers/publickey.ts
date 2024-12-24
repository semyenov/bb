import type { KeyStoreInstance } from '../../key-store'
import type { IdentityProvider, IdentityProviderGetIdOptions, IdentityProviderInstance, IdentityProviderOptions } from './types.d'

import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { IDENTITIES_PROVIDER_PUBLICKEY } from '../../constants'
import { signMessage } from '../../key-store'

export class PublicKeyIdentityProvider implements IdentityProviderInstance {
  type: 'publickey' = IDENTITIES_PROVIDER_PUBLICKEY
  private keystore: KeyStoreInstance

  private constructor({ keystore }: IdentityProviderOptions) {
    this.keystore = keystore
  }

  static create(options: IdentityProviderOptions): IdentityProviderInstance {
    PublicKeyIdentityProvider.verifyOptions(options)

    return new PublicKeyIdentityProvider(options)
  }

  static verifyOptions(options: IdentityProviderOptions): boolean {
    if (!options.keystore) {
      throw new Error('PublicKeyIdentityProvider requires a keystore parameter')
    }

    return true
  }

  async getId({ id }: IdentityProviderGetIdOptions): Promise<string> {
    if (!id) {
      throw new Error('id is required')
    }

    const key
      = await this.keystore.getKey(id)
      || await this.keystore.createKey(id)

    return uint8ArrayToString(
      key.publicKey.raw,
      'base16',
    )
  }

  async signIdentity(data: string | Uint8Array, { id }: IdentityProviderGetIdOptions): Promise<string> {
    if (!id) {
      throw new Error(
        'PublicKey identity provider requires an id to sign identity',
      )
    }

    const privateKey = await this.keystore.getKey(id)
    if (!privateKey) {
      throw new Error(
        `Signing key for '${id}' not found`,
      )
    }

    return signMessage(
      privateKey,
      data,
    )
  }
}

export const PublicKeyIdentity: IdentityProvider = {
  type: IDENTITIES_PROVIDER_PUBLICKEY,
  create: PublicKeyIdentityProvider.create,
}
