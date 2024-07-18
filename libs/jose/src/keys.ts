import { readFile } from 'node:fs/promises'

import { createLocalJWKSet, importJWK } from 'jose'

import type { KeyPair } from './types'

export const keys1: KeyPair = JSON.parse(
  await readFile('keys/key1.jwk', 'utf8'),
)
export const keys2: KeyPair = JSON.parse(
  await readFile('keys/key2.jwk', 'utf8'),
)

export const keys1Private = await importJWK(keys1.privateKey)
export const keys2Private = await importJWK(keys2.privateKey)

export const jwks = createLocalJWKSet({
  keys: [keys1.publicKey, keys2.publicKey],
})
