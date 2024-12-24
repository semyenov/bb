import type { Secp256k1PrivateKey } from '@regioni/orbit'
import type BN from 'bn.js'
import type {
  JWK_EC_Private,
  JWTHeaderParameters,
  JWTPayload,
  JWTVerifyGetKey,
  VerifyOptions,
} from 'jose'
import type { KeyPair } from './vendor.d'

import elliptic from 'elliptic'
import {
  importJWK,
  jwtVerify,
  SignJWT,
} from 'jose'

const headerParams = {
  kty: 'EC',
  alg: 'ES256K',
  crv: 'secp256k1',
  b64: true,
} as const satisfies JWTHeaderParameters

const EC = elliptic.ec
const ec = new EC('secp256k1')

export async function secp256k1ToJWK(keyPair: Secp256k1PrivateKey): Promise<KeyPair> {
  if (!keyPair) {
    throw new Error('No key pair provided')
  }

  const kid = (keyPair.publicKey.toCID()
    .toString()) || 'unknown'
  const keys = ec.keyFromPrivate(keyPair.raw)

  const publicKey = keys.getPublic()
  const privateKey = keys.getPrivate()

  const [
    x,
    y,
    d,
  ] = await Promise.all([
    publicKey.getX(),
    publicKey.getY(),
    privateKey,
  ])
    .then((xyd) => {
      return xyd.map(encodeBase64Url)
    })

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
    .setExpirationTime('10 minutes')
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

function encodeBase64Url(data: BN) {
  return data.toBuffer()
    .toString('base64url')
}
