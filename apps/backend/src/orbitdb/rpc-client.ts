import process from 'node:process'

import { bitswap } from '@helia/block-brokers'
import { createLogger } from '@regioni/lib-logger'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pOptions } from './config'
import { stringToUint8Array, uint8ArrayToString } from './utils'

const dbDir = process.argv[1] || './.orbitdb/db2'

const { libp2p } = await createHelia({
  libp2p: await createLibp2p({ ...DefaultLibp2pOptions }),
  blockstore: new LevelBlockstore(`${dbDir}/ipfs/blocks`),
  blockBrokers: [bitswap()],
})

await libp2p.services.rpc.start()

console.log('protocols:', libp2p.getProtocols())

libp2p.addEventListener('peer:connect', async (peerId) => {
  console.log('peer:connect PeerId', peerId.detail)

  try {
    const res = await libp2p.services.rpc.request(peerId.detail, 'echo', stringToUint8Array('hello'))

    console.log('client', uint8ArrayToString(res!))
  }
  catch (error) {
    console.error(error)
  }
})
