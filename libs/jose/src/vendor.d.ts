import type {
  JWK_EC_Private,
  JWK_EC_Public,
  JWTVerifyGetKey,
} from 'jose'

export type KeyPair = {
  privateKey: JWK_EC_Private
  publicKey: JWK_EC_Public
}

export interface IJoseVerify {
  keyPair: KeyPair
  jwks: JWTVerifyGetKey
}
