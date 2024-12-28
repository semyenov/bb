export interface IdentityProviderGetIdOptions { id: string }
export interface IdentityProviderOptions { keystore: KeyStoreInstance }
export interface IdentityProviderInstance {
  getId: (options: IdentityProviderGetIdOptions) => Promise<string>
  signIdentity: (
    data: string | Uint8Array,
    options: IdentityProviderGetIdOptions
  ) => Promise<string>
  type: string
}
export interface IdentityProvider {
  create: (options: IdentityProviderOptions) => IdentityProviderInstance
  type: string
}
