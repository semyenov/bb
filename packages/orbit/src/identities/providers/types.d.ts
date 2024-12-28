export type DataType = string | Uint8Array

export interface IdentityProviderGetIdOptions { 
  readonly id: string 
}

export interface IdentityProviderOptions { 
  readonly keystore: KeyStoreInstance 
}

export interface IdentityProviderInstance<T extends string = string> {
  readonly type: T
  getId: (options: IdentityProviderGetIdOptions) => Promise<string>
  signIdentity: (
    data: DataType,
    options: IdentityProviderGetIdOptions
  ) => Promise<string>
}

export interface IdentityProvider<T extends string = string> {
  readonly type: T
  create: (options: IdentityProviderOptions) => IdentityProviderInstance<T>
}
