import * as crypto from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'

// Определение типов
interface License {
  licenseId: string
  companyId: string
  startDate: string
  endDate: string
  limitations: {
    userLimit: number
    featureA: boolean
    featureB: boolean
  }
  version: number
}
const __dirname = path.dirname(process.cwd())
console.log(process.cwd())
// Конфигурация
const KEY_DIR = path.join(process.cwd(), '/.license_keys')
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'private_key.pem')
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'public_key.pem')

// Шаг 1: Генерация ключевой пары ED25519
async function generateKeyPair(): Promise<void> {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  await fs.mkdir(KEY_DIR, { recursive: true })
  await fs.writeFile(PRIVATE_KEY_PATH, privateKey)
  await fs.writeFile(PUBLIC_KEY_PATH, publicKey)

  console.log('Key pair generated and saved.')
}

// Шаг 2: Загрузка закрытого ключа из файловой системы
async function loadPrivateKey(): Promise<crypto.KeyObject> {
  const privateKeyPem = await fs.readFile(PRIVATE_KEY_PATH, 'utf8')

  return crypto.createPrivateKey(privateKeyPem)
}

// Шаг 3: Загрузка открытого ключа из файловой системы
async function loadPublicKey(): Promise<crypto.KeyObject> {
  const publicKeyPem = await fs.readFile(PUBLIC_KEY_PATH, 'utf8')

  return crypto.createPublicKey(publicKeyPem)
}

// Шаг 4: Создание структуры лицензионного ключа
function createLicenseStructure(companyId: string, userLimit: number): License {
  const now = new Date()
  const endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

  return {
    licenseId: crypto.randomUUID(),
    companyId,
    startDate: now.toISOString()
      .split('T')[0],
    endDate: endDate.toISOString()
      .split('T')[0],
    limitations: {
      userLimit,
      featureA: true,
      featureB: false,
    },
    version: 1,
  }
}

// Шаг 5: Подписание лицензионного ключа
async function signLicense(license: License): Promise<string> {
  const privateKey = await loadPrivateKey()
  const licenseString = JSON.stringify(license)

  const signature = crypto.sign(null, Buffer.from(licenseString), privateKey)

  return JSON.stringify({
    license: licenseString,
    signature: signature.toString('base64'),
  })
}

// Шаг 6: Распространение лицензионного ключа
function distributeLicenseKey(signedLicense: string): string {
  return Buffer.from(signedLicense)
    .toString('base64')
}

// Функция для проверки подписи (для демонстрации)
async function verifyLicense(distributedLicense: string): Promise<boolean> {
  const publicKey = await loadPublicKey()
  const { license, signature } = JSON.parse(Buffer.from(distributedLicense, 'base64')
    .toString())

  return crypto.verify(
    null,
    Buffer.from(license),
    publicKey,
    Buffer.from(signature, 'base64'),
  )
}

// Пример использования
async function exampleUsage() {
  try {
    // Генерация ключей (выполняется один раз)
    await generateKeyPair()

    // Создание лицензии
    const license = createLicenseStructure('COMPANY_123', 100)
    console.log('Created license structure:', license)

    // Подписание лицензии
    const signedLicense = await signLicense(license)
    console.log('Signed license:', signedLicense)

    // Распространение лицензионного ключа
    const distributedLicense = distributeLicenseKey(signedLicense)
    console.log('Distributed license key:', distributedLicense)

    // Проверка лицензии (для демонстрации)
    const isValid = await verifyLicense(distributedLicense)
    console.log('License is valid:', isValid)
  }
  catch (error) {
    console.error('An error occurred:', error)
  }
}

// Запуск примера
exampleUsage()
