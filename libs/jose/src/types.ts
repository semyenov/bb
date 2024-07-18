import type { GenerateKeyPairResult, JWTVerifyGetKey, KeyLike } from 'jose'

export type KeyPair = GenerateKeyPairResult<KeyLike>

export interface IJoseVerify {
  key: KeyPair
  jwks: JWTVerifyGetKey
}
