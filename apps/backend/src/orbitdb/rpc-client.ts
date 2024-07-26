import process from 'node:process'

import { bitswap } from '@helia/block-brokers'
import { createLogger } from '@regioni/lib-logger'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pOptions } from './config'

const dbDir = process.argv[1] || './.orbitdb/db2'

const { libp2p } = await createHelia({
  libp2p: await createLibp2p({ ...DefaultLibp2pOptions }),
  blockstore: new LevelBlockstore(`${dbDir}/ipfs/blocks`),
  blockBrokers: [bitswap()],
})

console.log('protocols:', libp2p.getProtocols())

libp2p.addEventListener('peer:connect', async (peerId) => {
  console.log('peer:connect PeerId', peerId.detail)
  try {
    await libp2p.services.rpc.send(peerId.detail, 'hello')
  }
  catch (error) {
    console.error(error)
  }
})
