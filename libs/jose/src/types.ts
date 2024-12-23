import type { JWK, JWTVerifyGetKey } from 'jose'

export type KeyPair = { privateKey: JWK, publicKey: JWK }
export interface IJoseVerify {
  keyPair: KeyPair
  jwks: JWTVerifyGetKey
}
