import type { GossipsubEvents } from '@chainsafe/libp2p-gossipsub'
import type { Identify } from '@libp2p/identify'
import type { PubSub } from '@libp2p/interface'
import type { HeliaLibp2p } from 'helia'
import type { Libp2p } from 'libp2p'

export type {
  KeyType,
  PeerId,
  PrivateKey,
  PublicKey,
  Secp256k1PrivateKey,
  Secp256k1PublicKey,
} from '@libp2p/interface'

export type OrbitDBHeliaInstance = HeliaLibp2p<Libp2p<{
  pubsub: PubSub<GossipsubEvents>
  identify: Identify
}>>
