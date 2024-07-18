import { bitswap } from '@helia/block-brokers'
import { KeyStore } from '@orbitdb/core'
import { secp256k1ToJWK } from '@regioni/lib-jose'
import { createLogger } from '@regioni/lib-logger'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import * as jose from 'jose'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pOptions } from './config'

const keysPath = './.out/keys'
const levelPath = './.out/blocks'

const algorithm = 'ES256K'
const options = DefaultLibp2pOptions
const logger = createLogger()

const ipfs = await createHelia({
  libp2p: await createLibp2p({ ...options }),
  blockstore: new LevelBlockstore(levelPath),
  blockBrokers: [bitswap()],
})

await ipfs.start()

const keystore = await KeyStore({ path: keysPath })
const keyPair = await keystore.createKey('userA')

const marshal = keyPair.marshal()
logger.info('marshal', marshal)

const privateJWK = await secp256k1ToJWK(keyPair)
logger.log('info', { privateJWK })

const signKey = await jose.importJWK(privateJWK)
logger.log('info', { importedJoseJWK: signKey })

const jws = await new jose.SignJWT({ payload: 'test' })
  .setProtectedHeader({ alg: algorithm })
  .sign(signKey)
logger.log('info', { jws })

const payload = await jose.jwtVerify(jws, signKey)
logger.log('info', { payload })

await ipfs.stop()
