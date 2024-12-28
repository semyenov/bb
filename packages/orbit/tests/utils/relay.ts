import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayServer } from '@libp2p/circuit-relay-v2'
import { privateKeyFromRaw } from '@libp2p/crypto/keys'
import { identify } from '@libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { createLogger } from '@regioni/lib-logger'
import { createLibp2p } from 'libp2p'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

const unmarshalPrivateKey = privateKeyFromRaw

const logger = createLogger({
  defaultMeta: {
    label: 'tests',
    package: 'orbit',
    version: '0.0.1',
  },
  level: 'debug',
})

async function main() {
  const relayPrivKey
    = '08011240821cb6bc3d4547fcccb513e82e4d718089f8a166b23ffcd4a436754b6b0774cf07447d1693cd10ce11ef950d7517bad6e9472b41a927cd17fc3fb23f8c70cd99'

  const encoded = uint8ArrayFromString(relayPrivKey, 'hex')
  const privateKey = unmarshalPrivateKey(encoded)
  logger.info('private key', { privateKey })

  const server = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/12345/ws'],
    },
    connectionEncrypters: [noise()],
    services: {
      identify: identify(),
      pubsub: gossipsub({
        allowPublishToZeroTopicPeers: true,
      }),
      relay: circuitRelayServer({
        reservations: {
          defaultDataLimit: BigInt(1024 * 1024 * 1024),
          maxReservations: 5000,
          reservationTtl: 1000,
        },
      }),
    },
    streamMuxers: [yamux()],
    transports: [
      webSockets({
        filter: filters.all,
      }),
    ],
  })

  server.addEventListener(
    'peer:connect',
    async (event) => {
      logger.info('peer:connect', event.detail)
    },
  )

  server.addEventListener(
    'peer:disconnect',
    async (event) => {
      logger.info('peer:disconnect', event.detail)
      server.peerStore.delete(event.detail)
    },
  )

  logger.info(
    'peer id and multiaddrs',
    {
      multiaddrs: server.getMultiaddrs()
        .map((ma) => {
          return ma.toString()
        }),
      peerId: server.peerId.toString(),
    },
  )
}

main()
