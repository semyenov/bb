import type { CID } from 'multiformats/cid'
import type { BlockDecoder, BlockEncoder } from 'multiformats/codecs/interface'

import { createLogger } from '@regioni/lib-logger'
import { randomBytes } from '@stablelib/random'
import { generateKeyPairFromSeed } from '@stablelib/x25519'
import * as dagJose from 'dag-jose'
import { decodeCleartext, prepareCleartext } from 'dag-jose-utils'
import {
  createJWE,
  decryptJWE,
  type JWE,
  xc20pAuthDecrypterEcdh1PuV3x25519WithXc20PkwV2 as x25519Decrypter,
  xc20pAuthEncrypterEcdh1PuV3x25519WithXc20PkwV2 as x25519Encrypter,
  xc20pDirDecrypter,
  xc20pDirEncrypter,
} from 'did-jwt'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import process from 'node:process'

const store = new Map<string, Uint8Array>()
// const dagJoseIpldFormat = toLegacyIpld(dagJose)

const logger = createLogger({
  defaultMeta: {
    app: 'orbitdb',
    module: 'dag-jose',
  },
})

async function symmetric() {
  // Encrypt and store a payload using a secret key
  const storeEncrypted = async (
    payload: Record<string, any>,
    key: Uint8Array,
  ) => {
    const dirEncrypter = xc20pDirEncrypter(key)
    // prepares a cleartext object to be encrypted in a JWE
    const cleartext = await prepareCleartext(payload)
    // encrypt into JWE container layout using secret key
    const jwe = await createJWE(cleartext, [dirEncrypter])
    // create an IPLD Block that has the CID:Bytes:Value triple
    const block = await Block.encode({
      codec: dagJose as unknown as BlockEncoder<133, JWE>,
      hasher: sha256,
      value: jwe,
    })
    logger.info(`Encrypted block CID: \u001B[32m${block.cid}\u001B[39m`)
    logger.info('Encrypted block contents:\n', block.value)
    // store the block, this could be in IPFS or any other CID:Bytes block store
    store.set(block.cid.toString(), block.bytes)

    return block.cid
  }

  const key = randomBytes(32)
  const secretz = { my: 'secret message' }
  logger.info('Encrypting and storing secret:\u001B[1m', secretz, '\u001B[22m')
  const cid = await storeEncrypted(secretz, key)
  const decoded = await loadEncrypted2(cid, key)
  logger.info(
    'Loaded and decrypted block content:\u001B[1m',
    decoded,
    '\u001B[22m',
  )
}
// Load an encrypted block from a CID and decrypt the payload using a secret key
async function loadEncrypted2(cid: CID, key: Uint8Array) {
  const dirDecrypter = xc20pDirDecrypter(key)
  const bytes = store.get(cid.toString())!
  // decode the DAG-JOSE envelope and verify the bytes match the CID
  const block = await Block.create({
    bytes,
    cid,
    codec: dagJose as unknown as BlockDecoder<133, JWE>,
    hasher: sha256,
  })
  // decrypt the encrypted payload
  const decryptedData = await decryptJWE(block.value, dirDecrypter)

  return decodeCleartext(decryptedData)
}

// Asymmetric encryption using a private and public key
async function asymmetric() {
  // Encrypt and store a payload using a public key
  const storeEncrypted = async (
    payload: Record<string, any>,
    pubkey: Uint8Array,
    senderSecret: Uint8Array,
  ) => {
    const encrypters = [x25519Encrypter(pubkey, senderSecret)]
    // prepares a cleartext object to be encrypted in a JWE
    const cleartext = await prepareCleartext(payload)
    // encrypt into JWE container layout using public key
    const value = await createJWE(cleartext, encrypters)
    // create an IPLD Block that has the CID:Bytes:Value triple
    const block = await Block.encode({
      codec: dagJose as unknown as BlockEncoder<133, JWE>,
      hasher: sha256,
      value,
    })

    logger.info(`Encrypted block CID: \u001B[32m${block.cid}\u001B[39m`)
    logger.info('Encrypted block contents:\n', block.value)
    // store the block, this could be in IPFS or any other CID:Bytes block store
    store.set(block.cid.toString(), block.bytes)

    return block.cid
  }

  const senderSecret = randomBytes(32)
  // generate a public key from the existing private key
  const pubkey = generateKeyPairFromSeed(senderSecret).publicKey
  const payload = {
    my: 'secret message',
  }
  logger.info(
    'Encrypting and storing secret with public key:\u001B[1m',
    payload,
    '\u001B[22m',
  )
  const cid = await storeEncrypted(payload, pubkey, senderSecret)
  const decoded = await loadEncrypted(cid, senderSecret, pubkey)
  logger.info(
    'Loaded and decrypted block content with private key:\u001B[1m',
    decoded,
    '\u001B[22m',
  )
}

// Load an encrypted block from a CID and decrypt the payload using a secret key
async function loadEncrypted(
  cid: CID,
  recipientSecret: Uint8Array,
  senderPublicKey: Uint8Array,
) {
  const asymDecrypter = x25519Decrypter(recipientSecret, senderPublicKey)
  const key = cid.toString()
  const bytes = store.get(key)
  if (!bytes) {
    throw new Error('Block not found')
  }

  // decode the DAG-JOSE envelope
  const block = await Block.create({
    bytes,
    cid,
    codec: dagJose as unknown as BlockDecoder<133, JWE>,
    hasher: sha256,
  })
  if (!block.cid.equals(cid)) {
    throw new Error('CID mismatch')
  }
  // decrypt the encrypted payload
  const decryptedData = await decryptJWE(block.value, asymDecrypter)

  return decodeCleartext(decryptedData)
}

// Run!
logger.info('Running symmetric example...')
symmetric()
  .then(async () => {
    logger.info('Running asymmetric example...')
    await asymmetric()
  })
  .catch((error) => {
    logger.error(error.stack)
    process.exit(1)
  })
