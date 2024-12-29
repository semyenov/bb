export interface IdentityProviderGetIdOptions {
  readonly id: string
}

export interface IdentityProviderOptions {
  readonly keystore: KeyStoreInstance
}

export interface IdentityProviderInstance<T extends string = string> {
  getId: (options: IdentityProviderGetIdOptions) => Promise<string>
  signIdentity: (
    data: string | Uint8Array,
    options: IdentityProviderGetIdOptions
  ) => Promise<string>
  readonly type: T
}

export interface IdentityProvider<T extends string = string> {
  create: (options: IdentityProviderOptions) => IdentityProviderInstance<T>
  readonly type: T
}
