import { bitswap } from '@helia/block-brokers'
import { secp256k1ToJWK } from '@regioni/lib-jose'
import { createLogger } from '@regioni/lib-logger'
import { KeyStore } from '@regioni/orbit'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import * as jose from 'jose'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pOptions } from './config'

const keysPath = './.out/keys'
const levelPath = './.out/blocks'

const algorithm = 'ES256K'
const options = DefaultLibp2pOptions

const logger = createLogger({
  defaultMeta: {
    label: 'orbitdb',
    service: 'backend',
    version: '0.0.1',
  },
  handleExceptions: true,
  handleRejections: true,
})

async function main() {
  const ipfs = await createHelia({
    blockBrokers: [bitswap()],
    blockstore: new LevelBlockstore(levelPath),
    libp2p: await createLibp2p({ ...options }),
  })

  await ipfs.start()

  const keystore = await KeyStore.create({ path: keysPath })
  const keyPair = await keystore.createKey('userA')

  const privateJWK = await secp256k1ToJWK(keyPair)
  logger.info('privateJWK', privateJWK)

  const signKey = await jose.importJWK(privateJWK.privateKey)
  logger.info('importedJoseJWK', signKey)

  const jws = await new jose.SignJWT({ test: 'test' })
    .setProtectedHeader({ alg: algorithm })
    .sign(signKey)
  logger.info('encoded jws', { jws })

  const {
    payload,
    protectedHeader,
  } = await jose.jwtVerify(jws, signKey)
  logger.info('payload', payload)
  logger.info('protectedHeader', protectedHeader)

  await ipfs.stop()
}

main()
