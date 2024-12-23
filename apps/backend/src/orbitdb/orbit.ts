import type { OrbitDBInstance, OrbitDBOptions } from '@regioni/orbit'

import { bitswap } from '@helia/block-brokers'
import { OrbitDB } from '@regioni/orbit'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pBrowserOptions, DefaultLibp2pOptions } from './config'

function isBrowser() {
  return typeof window !== 'undefined'
}

export async function startOrbitDB({
  id,
  identity,
  identities,
  directory = '.',
}: Omit<OrbitDBOptions, 'ipfs'>) {
  const options = isBrowser()
    ? DefaultLibp2pBrowserOptions
    : DefaultLibp2pOptions

  const ipfs = await createHelia({
    libp2p: await createLibp2p({ ...options }),
    blockstore: new LevelBlockstore(`${directory}/ipfs/blocks`),
    blockBrokers: [bitswap()],
  })

  return OrbitDB.create({
    id,
    identity,
    identities,
    directory,
    ipfs,
  })
}

export async function stopOrbitDB(orbitdb: OrbitDBInstance): Promise<void> {
  await orbitdb.stop()
  await orbitdb.ipfs.stop()
}
