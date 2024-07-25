import process from 'node:process'

import { bitswap } from '@helia/block-brokers'
import { createLogger } from '@regioni/lib-logger'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { pipe } from 'it-pipe'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pOptions } from './config'
import { createRPC } from './rpc'

// const logger = createLogger({
//   defaultMeta: {
//     service: 'test',
//   },
// })

// Get DB name and directory from command line
// const dbName = process.argv[2] || 'my-database'
const dbDir = process.argv[1] || './.orbitdb/db1'

// const dbId = process.argv[4]
//   || 'zdpuAsxVFKAoY6z8LnLsUtTKkGB4deEcXmhyAEbwkefaLsXR6'

const { libp2p } = await createHelia({
  libp2p: await createLibp2p({ ...DefaultLibp2pOptions, services: {
    ...DefaultLibp2pOptions.services,
    rpc: createRPC(),
  } }),
  blockstore: new LevelBlockstore(`${dbDir}/ipfs/blocks`),
  blockBrokers: [bitswap()],
})

libp2p.addEventListener('peer:connect', (peerId) => {
  console.log('peer:connect', peerId)
  console.log('peer:connect PeerId', peerId.detail)
  // logger.info('peer:connect', `${JSON.stringify(peerId)}123`)
})

libp2p.services.rpc.addMethod('echo', (args) => {
  if (!args) {
    return
  }

  console.log('server', uint8ArrayToString(args))
  // logger.info('server', args)

  return args
})

await libp2p.services.rpc.start()

// await rpc.start()
// console.log('protocols:', libp2p.getProtocols())

export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder()
    .encode(str)
}

export function uint8ArrayToString(uint8Array: Uint8Array): string {
  return new TextDecoder()
    .decode(uint8Array)
}
