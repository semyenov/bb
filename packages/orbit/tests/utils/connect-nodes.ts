import type { Multiaddr } from '@multiformats/multiaddr'
import type { OrbitDBHeliaInstance } from '@regioni/orbit'
import { multiaddr } from '@multiformats/multiaddr'

import { WebRTC } from '@multiformats/multiaddr-matcher'
import waitFor from './wait-for'

function defaultFilter() {
  return true
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export async function connectIpfsNodes(
  ipfs1: OrbitDBHeliaInstance,
  ipfs2: OrbitDBHeliaInstance,
  options = { filter: defaultFilter, address1: undefined, address2: undefined },
) {
  if (isBrowser()) {
    const relayId = '12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE'

    await ipfs1.libp2p.dial(
      multiaddr(`/ip4/127.0.0.1/tcp/12345/ws/p2p/${relayId}`),
    )

    let address1: Multiaddr | undefined
    let address2: Multiaddr | undefined

    await waitFor(
      async () => { }
        address1 = await ipfs2.libp2p.getMultiaddrs()
          .filter((ma) => {
            return WebRTC.matches(ma)
          })
          .pop()
      },
      async () => {
        address2 = await ipfs1.libp2p.getMultiaddrs()
          .filter((ma) => {
            return WebRTC.matches(ma)
          })
          .pop()
      }

    await ipfs2.libp2p
      .dial(multiaddr(options.address1 ?? address1))

    await ipfs1.libp2p
      .dial(multiaddr(options.address2 ?? address2))

    return {
      address1,
      address2,
    }
  }

  await ipfs2.libp2p.peerStore.save(
    ipfs1.libp2p.peerId,
    {
      publicKey: ipfs1.libp2p.peerId.publicKey,
      multiaddrs: ipfs1.libp2p
        .getMultiaddrs()
        .filter(options.filter),
    },
  )
  await ipfs2.libp2p.dial(
    ipfs1.libp2p.peerId,
  )
}
