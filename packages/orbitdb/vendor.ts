import type { keys as CryptoKeys } from '@libp2p/crypto'
import type { PrivateKey as Priv } from '@libp2p/interface'
import type { HeliaLibp2p } from 'helia'
import type { Libp2p } from 'libp2p'

export type PrivateKey = Priv
// export type PrivateKeys = PrivateKey<'secp256k1'>
export type Secp256k1PrivateKey = CryptoKeys.Secp256k1PrivateKey
export type IPFS = HeliaLibp2p<Libp2p<Record<string, unknown>>>

export type { PeerId } from '@libp2p/interface'
