import { bitswap } from '@helia/block-brokers'
import {
  Identities,
  KeyStore,
  OrbitDBAccessController,
  PublicKeyIdentityProvider,
  createOrbitDB,
} from '@orbitdb/core'
import { createLogger } from '@regioni/lib-logger'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pOptions } from './config'

const id = 'userA'
const keysPath = './.out/keys'
const options = DefaultLibp2pOptions

const logger = createLogger({
  defaultMeta: {
    service: 'orbitdb',
    label: 'keystore',
  },
})

const ipfs = await createHelia({
  libp2p: await createLibp2p({ ...options }),
  // blockstore: new LevelBlockstore(levelPath),
  blockBrokers: [bitswap()],
})

await ipfs.start()

const keystore = await KeyStore({ path: keysPath })
const identities = await Identities({ keystore, ipfs })

const provider = PublicKeyIdentityProvider({ keystore })

const identity = await identities.createIdentity({ id, provider })

logger.info('privateKey', await keystore.getKey(identity.id))

const orbit = await createOrbitDB({
  id: 'orbitdb-AAA',
  ipfs,
  identities,
  identity,
  directory: './.out/orbitdb',
})

const db = await orbit.open('test', {
  type: 'events',
  AccessController: OrbitDBAccessController({
    write: [identity.id],
  }),
})
const d: number = 4
if (d === 1 || d === 3) {
  logger.info('d is 1')
}
if (d === 2) {
  logger.info('d is 2')
}

for (let i = 0; i < 10; i++) {
  await db.add({ message: `Hello, world! ${i}` })

  logger.info('db', db.address)
}

await ipfs.stop()
