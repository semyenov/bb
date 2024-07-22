import { type GossipSub, GossipsubEvents, gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import {
  circuitRelayServer,
  circuitRelayTransport,
} from '@libp2p/circuit-relay-v2'
import { type Identify, identify } from '@libp2p/identify'
import { mdns } from '@libp2p/mdns'
import { tcp } from '@libp2p/tcp'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { createLogger } from '@regioni/lib-logger'

import type { PubSub, ServiceMap } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

export type Options<T extends ServiceMap = ServiceMap> = Libp2pOptions<T>

const logger = createLogger({
  defaultMeta: {
    service: 'libp2p',
  },
})

export const DefaultLibp2pOptions: Options = {
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/0/ws'],
  },
  logger: {
    forComponent(name: string) {
      const l = (formatter: any, ...args: any) => {
        logger.info(formatter, name, ...args)
      }

      l.enabled = true
      l.error = (formatter: any, ...args: any[]) => {
        logger.error(formatter, name, ...args)
      }
      l.trace = (formatter: any, ...args: any[]) => {
        logger.debug(formatter, name, ...args)
      }

      return l
    },
  },
  peerDiscovery: [mdns()],
  transports: [tcp(), webRTC(), webSockets({ filter: all })],
  connectionEncryption: [noise()],
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    },
  },
  services: {
    identify: identify(),
    circuitRelay: circuitRelayServer(),
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true,
    }),
  },
}

export const DefaultLibp2pBrowserOptions: Options = {
  addresses: {
    listen: ['/webrtc'],
  },
  transports: [
    tcp(),
    webRTC(),
    webSockets({ filter: all }),
    circuitRelayTransport({ discoverRelays: 1 }),
  ],
  connectionEncryption: [noise()],
  streamMuxers: [yamux()],
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
}
