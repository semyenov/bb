import type { StorageInstance } from './storage'
import type { PrivateKey, Secp256k1PrivateKey } from './vendor'

interface KeyObject {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

interface KeyStoreOptions {
  storage?: StorageInstance
  path?: string
}
interface KeyStoreInstance {
  addKey: (id: string, key: PrivateKey) => Promise<void>
  clear: () => Promise<void>
  close: () => Promise<void>
  createKey: (id: string) => Promise<PrivateKey>
  removeKey: (id: string) => Promise<void>
  getKey: (id: string) => Promise<PrivateKey>
  getPublic: (keys: PrivateKey, options?: { format: 'hex' }) => string
  getPublic: (
    keys: PrivateKey,
    options?: { format: 'buffer' },
  ) => Promise<Uint8Array>
  hasKey: (id: string) => Promise<boolean>
}
declare function KeyStore(options?: KeyStoreOptions): Promise<KeyStoreInstance>

export type {
  KeyObject,
  KeyStoreInstance,
  KeyStoreOptions,
  PrivateKey as PrivateKeys,
  Secp256k1PrivateKey,
}
export { KeyStore }

export function verifyMessage(
  signature: string,
  publicKey: string,
  data: string | Uint8Array,
): Promise<boolean>
export function signMessage(
  key: Secp256k1PrivateKey,
  data: string | Uint8Array,
): Promise<string>
