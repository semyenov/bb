import { bitswap } from '@helia/block-brokers'
import { secp256k1ToJWK } from '@regioni/lib-jose'
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

async function main() {
  const ipfs = await createHelia({
    libp2p: await createLibp2p({ ...options }),
    blockstore: new LevelBlockstore(levelPath),
    blockBrokers: [bitswap()],
  })

  await ipfs.start()

  const keystore = await KeyStore.create({ path: keysPath })
  const keyPair = await keystore.createKey('userA')

  const privateJWK = await secp256k1ToJWK(keyPair)
  console.log('privateJWK', privateJWK)

  const signKey = await jose.importJWK(privateJWK.privateKey)
  console.log('importedJoseJWK', signKey)

  const jws = await new jose.SignJWT({ payload: 'test' })
    .setProtectedHeader({ alg: algorithm })
    .sign(signKey)
  console.log('jws', jws)

  const payload = await jose.jwtVerify(jws, signKey)
  console.log('payload', payload)

  await ipfs.stop()
}

main()
