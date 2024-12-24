export interface IdentityProviderGetIdOptions { id: string }
export interface IdentityProviderOptions { keystore: KeyStoreInstance }
export interface IdentityProviderInstance {
  type: string
  getId: (options: IdentityProviderGetIdOptions) => Promise<string>
  signIdentity: (
    data: string | Uint8Array,
    options: IdentityProviderGetIdOptions
  ) => Promise<string>
}
export interface IdentityProvider {
  type: string
  create: (options: IdentityProviderOptions) => IdentityProviderInstance
}
