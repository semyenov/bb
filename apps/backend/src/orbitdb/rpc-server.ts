import process from 'node:process'

import { bitswap } from '@helia/block-brokers'
import { createLogger } from '@regioni/lib-logger'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

import { DefaultLibp2pOptions } from './config'

const dbDir = process.argv[1] || './.orbitdb/db1'

const { libp2p } = await createHelia({
  libp2p: await createLibp2p({ ...DefaultLibp2pOptions }),
  blockstore: new LevelBlockstore(`${dbDir}/ipfs/blocks`),
  blockBrokers: [bitswap()],
})

libp2p.addEventListener('peer:connect', (peerId) => {
  console.log('peer:connect', peerId)
  console.log('peer:connect PeerId', peerId.detail)
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

export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder()
    .encode(str)
}

export function uint8ArrayToString(uint8Array: Uint8Array): string {
  return new TextDecoder()
    .decode(uint8Array)
}
