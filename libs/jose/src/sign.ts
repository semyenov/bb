import { Buffer } from 'node:buffer'

import { createLogger } from '@regioni/lib-logger'
import Elliptic from 'elliptic'
import {
  type JWK,
  type JWTHeaderParameters,
  type JWTPayload,
  type JWTVerifyGetKey,
  SignJWT,
  type VerifyOptions,
  importJWK,
  jwtVerify,
} from 'jose'

import type { PrivateKeys as PrivateKey } from '@orbitdb/core'
import type { KeyPair } from '@regioni/lib-jose'
import type { BN } from 'bn.js'

const logger = createLogger({
  defaultMeta: {
    service: 'jose',
    label: 'sign',
  },
})

const ec = new Elliptic.ec('secp256k1')
const headerParams: JWTHeaderParameters = {
  kty: 'EC',
  alg: 'ES256K',
  crv: 'secp256k1',
  b64: true,
}

export async function secp256k1ToJWK(keyPair: PrivateKey): Promise<KeyPair> {
  if (!keyPair) {
    throw new Error('No key pair provided')
  }

  const kid = (await keyPair.id()) || 'unknown'
  const keys = ec.keyFromPrivate(keyPair.marshal())

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

export async function sign(jwk: JWK, payload: JWTPayload) {
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
