import process from 'node:process'

import { bitswap } from '@helia/block-brokers'
import { createLogger } from '@regioni/lib-logger'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pOptions } from './config'
import { createRPC } from './rpc'
import { stringToUint8Array, uint8ArrayToString } from './rpc-server'

// const logger = createLogger({
//   defaultMeta: {
//     service: 'test',
//   },
// })

const dbDir = process.argv[1] || './.orbitdb/db2'

const { libp2p } = await createHelia({
  libp2p: await createLibp2p({ ...DefaultLibp2pOptions, services: {
    ...DefaultLibp2pOptions.services,
    rpc: createRPC(),
  } }),
  blockstore: new LevelBlockstore(`${dbDir}/ipfs/blocks`),
  blockBrokers: [bitswap()],
})

await libp2p.services.rpc.start()

// const rpc = createRPC()(libp2p)

console.log('protocols:', libp2p.getProtocols())
// console.log('test', libp2p)
libp2p.addEventListener('peer:connect', async (peerId) => {
  // console.log('peer:connect', peerId)
  console.log('peer:connect PeerId', peerId.detail)

  libp2p.services.rpc.request(peerId.detail, 'echo', stringToUint8Array('hello'))
    .then((res) => {
      if (!res) {
        return
      }
      console.log('client', uint8ArrayToString(res))
    })
  // logger.info('peer:connect', `${JSON.stringify(peerId)}123`)
})

// await rpc.start()