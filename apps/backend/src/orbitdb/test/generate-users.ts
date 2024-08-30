import { Buffer } from 'node:buffer'
import { subtle, webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'

const crypto = webcrypto

interface UserCertificate {
  userId: string
  publicKey: string
  expiryDate: Date
  role: string
  signature: string
}

async function generateUserKeys(serverPrivateKey: CryptoKey, userId: string, role: string): Promise<UserCertificate> {
  // Генерируем новую пару ключей Ed25519 для пользователя
  const userKeyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
    },
    true,
    ['sign', 'verify'],
  )

  const userPublicKey = await crypto.subtle.exportKey('raw', userKeyPair.publicKey)

  const expiryDate = new Date()
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)

  const userCertificate: UserCertificate = {
    userId,
    publicKey: Buffer.from(userPublicKey)
      .toString('base64'),
    expiryDate,
    role,
    signature: '',
  }

  const encoder = new TextEncoder()
  const dataToSign = encoder.encode(JSON.stringify({
    userId: userCertificate.userId,
    publicKey: userCertificate.publicKey,
    expiryDate: userCertificate.expiryDate.toISOString(),
    role: userCertificate.role,
  }))

  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    serverPrivateKey,
    dataToSign,
  )

  userCertificate.signature = Buffer.from(signature)
    .toString('base64')

  return userCertificate
}

function pemToBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  return Buffer.from(base64, 'base64')
}

async function importServerPrivateKey(path: string): Promise<CryptoKey> {
  const pemContents = readFileSync(path, 'utf8')
  const privateKeyBuffer = pemToBuffer(pemContents)

  return await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'Ed25519',
    },
    false,
    ['sign'],
  )
}

async function main() {
  const userId = 'user123'
  const role = 'admin'

  try {
    const serverPrivateKey = await importServerPrivateKey('./.keys/private_key.pem')
    const userCertificate = await generateUserKeys(serverPrivateKey, userId, role)
    console.log('User Certificate:', userCertificate)
  }
  catch (error) {
    console.error('Error generating user keys or importing server key:', error)
  }
}

main()
  .catch(console.error)
