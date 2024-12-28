import { bitswap } from '@helia/block-brokers'
import {
  createOrbitDB,
  Identities,
  KeyStore,
  PublicKeyIdentityProvider,
} from '@regioni/orbit'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

import { createLogger } from '@/libs/logger'

import { DefaultLibp2pOptions } from './config'

const id = 'userA'
const keysPath = './.out/keys'
const levelPath = './.out/level'
const options = DefaultLibp2pOptions

const logger = createLogger({
  defaultMeta: {
    label: 'keystore',
    module: 'keystore',
    service: 'orbitdb',
    version: '1.0.0',
  },
})

async function main() {
  const ipfs = await createHelia({
    blockBrokers: [bitswap()],
    blockstore: new LevelBlockstore(levelPath),
    libp2p: await createLibp2p({ ...options }),
  })

  await ipfs.start()

  const keystore = await KeyStore.create({ path: keysPath })
  const identities = await Identities.create({ ipfs, keystore })
  const provider = PublicKeyIdentityProvider.create({ keystore })
  const identity = await identities.createIdentity({ id, provider })
  const orbit = await createOrbitDB({
    dir: './.out/orbitdb',
    id: 'orbitdb-AAA',
    identities,
    identity,
    ipfs,
  })

  const db = await orbit.open('events', 'test')
  logger.info('opened', { data: db.address })

  for (let i = 0; i < 10; i++) {
    await db.add({ message: `Hello, world! ${i}` })
    logger.info('added', { message: `Hello, world! ${i}` })
  }

  logger.info('done')

  await ipfs.stop()
}

main()
