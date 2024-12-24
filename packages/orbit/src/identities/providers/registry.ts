import type {
  IdentityProvider,
} from './types.d'

import { PublicKeyIdentity } from './publickey'

export class IdentityProviderRegistry {
  private static providers = new Map<
    string,
    IdentityProvider['create']
  >()

  static isProviderSupported(type: string): boolean {
    return this.providers.has(type)
  }

  static getIdentityProvider(
    type: string,
  ): IdentityProvider['create'] | undefined {
    if (!this.isProviderSupported(type)) {
      throw new Error(
        `IdentityProvider type '${type}' is not supported`,
      )
    }

    return this.providers.get(type)
  }

  static useIdentityProvider(
    identityProvider: IdentityProvider,
  ): void {
    if (!identityProvider.type) {
      throw new Error(
        'Given IdentityProvider doesn\'t have a field \'type\'.',
      )
    }

    if (!identityProvider.create) {
      throw new Error(
        'Given IdentityProvider doesn\'t have a function \'create\'.',
      )
    }

    this.providers.set(
      identityProvider.type,
      identityProvider.create,
    )
  }
}

// Register the PublicKeyIdentityProvider
IdentityProviderRegistry.useIdentityProvider(PublicKeyIdentity)
