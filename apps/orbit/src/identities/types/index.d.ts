/* eslint-disable no-unused-vars */
import type { KeyStoreInstance } from '../../key-store'
import type { StorageInstance } from '../../storage'
import type { HeliaInstance } from '../../vendor'

interface IdentityProviderGetIdOptions {
  id: string
}
interface IdentityProviderOptions {
  keystore?: KeyStoreInstance
}
interface IdentityProviderInstance {
  type: string
  getId: (options: IdentityProviderGetIdOptions) => string
  signIdentity: (data: string, options: IdentityProviderGetIdOptions) => string
}
type IdentityProvider<T extends string, U extends IdentityProviderInstance> = {
  (options: IdentityProviderOptions): U
  verifyIdentity: (data: any) => Promise<boolean>
  type: T
}

interface IdentityOptions {
  id: string
  type: string
  publicKey: string
  signatures: { id: string; publicKey: string }

  sign?: (data: any) => Promise<string>
  verify?: (data: any, signature: string) => Promise<boolean>
}
interface IdentityInstance extends IdentityOptions {
  hash: string
  bytes: Uint8Array
}
declare function Identity(options: IdentityOptions): Promise<IdentityInstance>

interface IdentitiesCreateIdentityOptions {
  id?: string
  provider?: IdentityProviderInstance
}
interface IdentitiesOptions {
  path?: string

  ipfs?: HeliaInstance
  keystore?: KeyStoreInstance
  storage?: StorageInstance
}
interface IdentitiesInstance {
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
declare function Identities(
  options?: IdentitiesOptions,
): Promise<IdentitiesInstance>

declare const PublicKeyIdentityProvider: IdentityProvider<
  'publickey',
  IdentityProviderInstance
>

export type {
  IdentitiesCreateIdentityOptions,
  IdentitiesInstance,
  IdentitiesOptions,
  IdentityInstance,
  IdentityOptions,
  IdentityProvider,
  IdentityProviderInstance,
}
export { Identities, Identity, PublicKeyIdentityProvider }

export function getIdentityProvider(type: string): IdentityProviderInstance
export function useIdentityProvider(
  identityProvider: IdentityProvider<string, IdentityProviderInstance>,
): void
export function decodeIdentity(bytes: Uint8Array): Promise<IdentityInstance>
export function isIdentity(identity: any): boolean
export function isEqual(
  identity1: IdentityInstance,
  identity2: IdentityInstance,
): boolean
