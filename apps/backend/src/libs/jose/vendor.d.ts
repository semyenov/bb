import type {
  JWK_EC_Private,
  JWK_EC_Public,
  JWTVerifyGetKey,
} from 'jose'

export interface KeyPair {
  readonly privateKey: JWK_EC_Private
  readonly publicKey: JWK_EC_Public
}

export interface IJoseVerify {
  readonly jwks: JWTVerifyGetKey
  readonly keyPair: Readonly<KeyPair>
}
