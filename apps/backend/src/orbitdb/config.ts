import type { GossipsubEvents } from '@chainsafe/libp2p-gossipsub'
import type { Identify } from '@libp2p/identify'
import type { PubSub } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { mdns } from '@libp2p/mdns'
import { tcp } from '@libp2p/tcp'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'

export const DefaultLibp2pOptions: Libp2pOptions<{
  identify: Identify
  pubsub: PubSub<GossipsubEvents>
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

  peerDiscovery: [mdns()],
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
    webSockets({
      filter: all,
    }),
    circuitRelayTransport(),
  ],
} as const

export const DefaultLibp2pBrowserOptions: Libp2pOptions<{
  identify: Identify
  pubsub: PubSub<GossipsubEvents>
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
} as const
