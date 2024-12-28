import * as dagCbor from '@ipld/dag-cbor'
import { base58btc } from 'multiformats/bases/base58'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'

import type { IdentityProviderInstance } from './providers'

import { verifyMessage } from '../key-store'

export type DataType = string | Uint8Array

export interface IdentitySignatures {
  readonly id: string
  readonly publicKey: string
}

export interface IdentityOptions<T extends string = string> {
  readonly id: string
  readonly provider?: IdentityProviderInstance<T>
  readonly publicKey: string
  readonly sign: (data: DataType) => Promise<string>
  readonly signatures: IdentitySignatures
  readonly type: T
  readonly verify: (signature: string, publicKey: string, data: DataType) => Promise<boolean>
}

export interface IdentityInstance {
  bytes: Uint8Array
  hash: string
  id: string
  provider?: IdentityProviderInstance
  publicKey: string
  sign: (data: string | Uint8Array) => Promise<string>
  signatures: IdentitySignatures

  type: string
  verify: (signature: string, publicKey: string, data: string | Uint8Array) => Promise<boolean>
}

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

export class Identity implements IdentityInstance {
  bytes: Uint8Array
  hash: string
  id: string
  provider?: IdentityProviderInstance
  publicKey: string
  sign: (data: string | Uint8Array) => Promise<string>
  signatures: IdentitySignatures
  type: string

  verify: (signature: string, publicKey: string, data: string | Uint8Array) => Promise<boolean>

  private constructor(
    options: { hash: string, bytes: Uint8Array } & IdentityOptions,
  ) {
    this.id = options.id
    this.type = options.type
    this.publicKey = options.publicKey
    this.signatures = options.signatures
    this.provider = options.provider
    this.sign = options.sign
    this.verify = options.verify
    this.hash = options.hash
    this.bytes = options.bytes
  }

  static async create(options: IdentityOptions): Promise<Identity> {
    Identity.validateOptions(options)
    const identity = await Identity.encodeIdentity(options)

    return new Identity({
      ...identity,
      ...options,
    })
  }

  static async decode(bytes: Uint8Array): Promise<Identity> {
    const { value } = await Block.decode<IdentityOptions, 113, 18>({
      bytes,
      codec,
      hasher,
    })

    return Identity.create({ ...value })
  }

  static isEqual(a: Identity, b: Identity): boolean {
    return (
      a.id === b.id
      && a.hash === b.hash
      && a.type === b.type
      && a.publicKey === b.publicKey
      && a.signatures.id === b.signatures.id
      && a.signatures.publicKey === b.signatures.publicKey
    )
  }

  static isIdentity(identity: unknown): identity is Identity {
    return identity instanceof Identity
  }

  private static async encodeIdentity(
    identity: IdentityOptions,
  ): Promise<{ hash: string, bytes: Uint8Array }> {
    const { id, publicKey, signatures, type } = identity
    const { bytes, cid } = await Block.encode({
      codec,
      hasher,
      value: {
        id,
        publicKey,
        signatures,
        type,
      },
    })

    return {
      bytes: Uint8Array.from(bytes),
      hash: cid.toString(hashStringEncoding),
    }
  }

  private static validateOptions(options: IdentityOptions): void {
    if (!options.id) {
      throw new Error('Identity id is required')
    }
    if (!options.publicKey) {
      throw new Error('Invalid public key')
    }
    if (!options.signatures) {
      throw new Error('Signatures object is required')
    }
    if (!options.signatures.id) {
      throw new Error('Signature of id is required')
    }
    if (!options.signatures.publicKey) {
      throw new Error('Signature of publicKey+id is required')
    }
    if (!options.type) {
      throw new Error('Identity type is required')
    }
  }

  async verifyIdentity(): Promise<boolean> {
    const {
      id,
      publicKey,
      signatures,
    } = this

    return verifyMessage(
      signatures.publicKey,
      id,
      publicKey + signatures.id,
    )
  }
}
