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
import { DefaultLibp2pOptions } from './config'

const id = 'userA'
const keysPath = './.out/keys'
const levelPath = './.out/level'
const options = DefaultLibp2pOptions

async function main() {
  const ipfs = await createHelia({
    libp2p: await createLibp2p({ ...options }),
    blockstore: new LevelBlockstore(levelPath),
    blockBrokers: [bitswap()],
  })

  await ipfs.start()

  const keystore = await KeyStore.create({ path: keysPath })
  const identities = await Identities.create({ keystore, ipfs })

  const provider = new PublicKeyIdentityProvider({ keystore })

  const identity = await identities.createIdentity({ id, provider })

  console.log('privateKey', await keystore.getKey(identity.id))

  const orbit = await createOrbitDB({
    id: 'orbitdb-AAA',
    ipfs,
    identities,
    identity,
    directory: './.out/orbitdb',
  })

  const db = await orbit.open('events', 'test')
  for (let i = 0; i < 10; i++) {
    await db.add({ message: `Hello, world! ${i}` })

    console.log('db', db.address)
  }

  await ipfs.stop()
}

main()
