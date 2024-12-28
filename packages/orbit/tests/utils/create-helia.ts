import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bitswap } from '@helia/block-brokers'
import { identify } from '@libp2p/identify'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { MemoryBlockstore } from 'blockstore-core'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

function isBrowser() {
  return typeof window !== 'undefined'
}

const Libp2pOptions = {
  addresses: {
    listen: ['/webrtc'],
  },
  connectionEncryption: [noise()],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    },
  },
  services: {
    identify: identify(),
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true,
    }),
  },
  streamMuxers: [yamux()],
  transports: [
    webRTC(),
    webSockets({
      filter: all,
    }),
  ],
}

/**
 * A basic Libp2p configuration for browser nodes.
 */
const Libp2pBrowserOptions = {
  addresses: {
    listen: ['/webrtc'],
  },
  connectionEncryption: [noise()],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    },
  },
  services: {
    identify: identify(),
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true,
    }),
  },
  streamMuxers: [yamux()],
  transports: [
    webRTC(),
    webSockets({
      filter: all,
    }),
  ],
}

interface CreateHeliaOptions {
  dir: string
}

export default async ({ dir }: CreateHeliaOptions = { dir: '.orbitdb' }) => {
  const options = isBrowser()
    ? Libp2pBrowserOptions
    : Libp2pOptions

  const libp2p = await createLibp2p({
    ...options,
  })

  const blockstore = dir
    ? new LevelBlockstore(`${dir}/blocks`)
    : new MemoryBlockstore()

  return createHelia({
    blockBrokers: [bitswap()],
    blockstore,
    libp2p,
  })
}
