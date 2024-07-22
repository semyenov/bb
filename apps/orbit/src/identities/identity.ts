/* eslint-disable no-unused-vars */
import * as dagCbor from '@ipld/dag-cbor'
import { base58btc } from 'multiformats/bases/base58'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'

export interface IdentityOptions {
  id: string
  type: string
  publicKey: string
  signatures: { id: string; publicKey: string }

  sign?: (data: any) => Promise<string>
  verify?: (data: any, signature: string) => Promise<boolean>
}
export interface IdentityInstance extends IdentityOptions {
  hash: string
  bytes: Uint8Array
}

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

export const Identity = async ({
  id,
  publicKey,
  signatures,
  type,
  sign,
  verify,
}: IdentityOptions) => {
  if (!id) {
    throw new Error('Identity id is required')
  }
  if (!publicKey) {
    throw new Error('Invalid public key')
  }
  if (!signatures) {
    throw new Error('Signatures object is required')
  }
  if (!signatures.id) {
    throw new Error('Signature of id is required')
  }
  if (!signatures.publicKey) {
    throw new Error('Signature of publicKey+id is required')
  }
  if (!type) {
    throw new Error('Identity type is required')
  }

  const { hash, bytes } = await encodeIdentity({
    id,
    type,
    publicKey,
    signatures,
  })

  const identity: IdentityInstance = {
    id,
    type,
    publicKey,
    signatures,

    sign,
    verify,

    hash,
    bytes,
  }

  return identity
}

const encodeIdentity = async (identity: IdentityOptions) => {
  const { id, publicKey, signatures, type } = identity
  const value = { id, publicKey, signatures, type }
  const { cid, bytes } = await Block.encode({ value, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  return { hash, bytes: Uint8Array.from(bytes) }
}

export async function decodeIdentity(bytes: Uint8Array) {
  const { value } = await Block.decode<IdentityOptions, 113, 18>({
    bytes,
    codec,
    hasher,
  })

  return Identity({ ...value })
}

export function isIdentity(identity: any): identity is IdentityInstance {
  return Boolean(
    identity.id &&
      identity.hash &&
      identity.bytes &&
      identity.publicKey &&
      identity.signatures &&
      identity.signatures.id &&
      identity.signatures.publicKey &&
      identity.type,
  )
}

export function isEqual(a: IdentityInstance, b: IdentityInstance) {
  return (
    a.id === b.id &&
    a.hash === b.hash &&
    a.type === b.type &&
    a.publicKey === b.publicKey &&
    a.signatures.id === b.signatures.id &&
    a.signatures.publicKey === b.signatures.publicKey
  )
}
