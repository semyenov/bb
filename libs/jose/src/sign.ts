import type { PrivateKey } from '@regioni/orbit'

import type { BN } from 'bn.js'
import type {
  JWK_EC_Private,
  JWK_EC_Public,
  JWTHeaderParameters,
  JWTPayload,
  JWTVerifyGetKey,
  VerifyOptions,
} from 'jose'

import { Buffer } from 'node:buffer'
import { ec as EC } from 'elliptic'
import {
  importJWK,
  jwtVerify,
  SignJWT,
} from 'jose'

const ec = new EC('secp256k1')
const headerParams = {
  kty: 'EC',
  alg: 'ES256K',
  crv: 'secp256k1',
  b64: true,
} satisfies JWTHeaderParameters

export async function secp256k1ToJWK(keyPair: PrivateKey): Promise<{
  privateKey: JWK_EC_Private
  publicKey: JWK_EC_Public
}> {
  if (!keyPair) {
    throw new Error('No key pair provided')
  }

  const kid = (keyPair.publicKey.toCID()
    .toString()) || 'unknown'
  const keys = ec.keyFromPrivate(keyPair.raw)

  const [x, y, d] = await Promise.all([
    encodeBase64Url(keys.getPublic()
      .getX()),
    encodeBase64Url(keys.getPublic()
      .getY()),
    encodeBase64Url(keys.getPrivate()),
  ])

  return {
    privateKey: { ...headerParams, kid, x, y, d },
    publicKey: { ...headerParams, kid, x, y },
  }
}

export async function sign(jwk: JWK_EC_Private, payload: JWTPayload) {
  const signKey = await importJWK(jwk)
  if (!signKey) {
    throw new Error('Invalid JWK')
  }

  return new SignJWT(payload)
    .setIssuer('io:regioni:tula')
    .setAudience('io:regioni:tula:users')
    .setProtectedHeader({ ...headerParams, kid: jwk.kid })
    .setExpirationTime('10m')
    .setIssuedAt()
    .sign(signKey)
}

export function verify(
  jwt: string,
  keyset: JWTVerifyGetKey,
  options?: VerifyOptions,
) {
  return jwtVerify(jwt, keyset, options)
}

function encodeBase64Url(data: typeof BN.prototype) {
  return Buffer.from(data.toString('hex'), 'hex')
    .toString('base64url')
}
