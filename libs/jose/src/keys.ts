import { createLocalJWKSet, importJWK } from 'jose'
import { readFile } from 'node:fs/promises'

import type { KeyPair } from './vendor.d'

async function main() {
  const keys1: KeyPair = JSON.parse(
    await readFile('keys/key1.jwk', 'utf8'),
  )
  const keys2: KeyPair = JSON.parse(
    await readFile('keys/key2.jwk', 'utf8'),
  )

  const keys1Private = await importJWK(keys1.privateKey)
  const keys2Private = await importJWK(keys2.privateKey)

  const jwks = createLocalJWKSet({
    keys: [keys1.publicKey, keys2.publicKey],
  })

  return {
    jwks,
    keys1Private,
    keys2Private,
  }
}

main()
