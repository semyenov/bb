import type { GossipsubEvents } from '@chainsafe/libp2p-gossipsub'
import type { Identify } from '@libp2p/identify'
import type { PubSub } from '@libp2p/interface'

import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bitswap } from '@helia/block-brokers'
// import { bootstrap } from '@libp2p/bootstrap'
import {
  circuitRelayTransport,
} from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { mdns } from '@libp2p/mdns'
import { tcp } from '@libp2p/tcp'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p, type Libp2pOptions } from 'libp2p'

import { OrbitDB } from './orbitdb'

const directory = './orbitdb'
const id = 'test'

const options: Libp2pOptions<{
  pubsub: PubSub<GossipsubEvents>
  identify: Identify
}> = {
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/0/ws'],
  },
  connectionEncrypters: [noise()],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    },
  },
  connectionManager: { maxPeerAddrsToDial: 1000 },
  peerDiscovery: [
    mdns(),
    // bootstrap(),
  ],
  services: {
    identify: identify(),
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true,
    }),
  },
  streamMuxers: [yamux()],
  transports: [
    tcp(),
    webRTC(),
    webSockets({ filter: all }),
    circuitRelayTransport(),
  ],
}

async function main() {
  const ipfs = await createHelia({
    blockBrokers: [bitswap()],
    blockstore: new LevelBlockstore(`${directory}/ipfs/blocks`),
    libp2p: await createLibp2p({ ...options }),
  })
  const orbit = await OrbitDB.create({
    dir: './orbitdb',
    id,
    ipfs,
  })

  const db = await orbit.open<{ _id: string, test: string }, 'documents'>(
    'documents',
    id,
  )

  db.events.addEventListener('update', (entry) => {
    console.log(entry)
  })

  console.log(db)
  db.put({ _id: 'test', test: 'test' })

  const result = await db.get('test')
  console.log(result)
}

main()
