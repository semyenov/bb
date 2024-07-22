import type { keys as CryptoKeys } from '@libp2p/crypto'
import type { HeliaLibp2p } from 'helia'
import type { Libp2p } from 'libp2p'

export type Secp256k1PrivateKey = CryptoKeys.Secp256k1PrivateKey
export type Secp256k1PublicKey = CryptoKeys.Secp256k1PublicKey
export type HeliaInstance = HeliaLibp2p<Libp2p<Record<string, unknown>>>

export type { PeerId, PublicKey, KeyType, PrivateKey } from '@libp2p/interface'
