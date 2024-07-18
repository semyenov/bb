import { Buffer } from 'node:buffer'

import { createLogger } from '@regioni/lib-logger'
import Elliptic from 'elliptic'
import {
  type JWK,
  SignJWT as JWT,
  type JWTHeaderParameters,
  type JWTPayload,
  type JWTVerifyGetKey,
  type VerifyOptions,
  exportJWK,
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

const { ec: EC } = Elliptic
const ec = new EC('secp256k1')

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
    decode(keys.getPublic().getX()),
    decode(keys.getPublic().getY()),
    decode(keys.getPrivate()),
  ])

  const exported = await exportJWK(Buffer.from(keys.getPrivate('hex'), 'hex'))
  const imported = await importJWK(exported, 'ES256K')
  logger.warn('TEST', {
    exported,
    imported,
    // subtle: await subtle.importKey(
    //   'raw',
    //   keyPair.bytes,
    //   { name: 'ES256K', namedCurve: 'secp256k1' },
    //   true,
    //   ['sign', 'verify'],
    // ),
  })

  return {
    privateKey: Object.assign(Object.create(null), headerParams, {
      kid,
      x,
      y,
      d,
    }),
    publicKey: Object.assign(Object.create(null), headerParams, {
      kid,
      x,
      y,
    }),
  }
}

// export async function jwkToSecp256k1(jwk: JWK): Promise<KeyPair> {
//   if (!jwk.d || !jwk.x || !jwk.y) {
//     throw new Error('Invalid JWK')
//   }

//   const keys = ec.keyFromPrivate(
//     Buffer.from(
//       ((await importJWK(jwk)) as KeyLike).toString('hex'),
//       'base64url',
//     ),
//   )

//   return Promise.resolve(
//     ec.keyPair({
//       priv: Buffer.from(keys.getPrivate('hex'), 'hex'),
//       pub: Buffer.from(keys.getPublic('hex'), 'hex'),
//       privEnc: 'base64url',
//       pubEnc: 'base64url',
//     }),
//   )
// }

export async function sign(jwk: JWK, payload: JWTPayload) {
  const signKey = await importJWK(jwk)
  if (!signKey) {
    throw new Error('Invalid JWK')
  }

  return new JWT(payload)
    .setIssuer('io:regioni:tula')
    .setAudience('io:regioni:tula:users')
    .setProtectedHeader({
      ...headerParams,
      kid: jwk.kid,
    })
    .setExpirationTime('10m')
    .setIssuedAt(new Date())
    .sign(signKey)
}

export function verify(
  jwt: string,
  keyset: JWTVerifyGetKey,
  options?: VerifyOptions,
) {
  return jwtVerify(jwt, keyset, options)
}

function decode(data: typeof BN.prototype) {
  return Buffer.from(data.toString('hex'), 'hex').toString('base64url')
}
