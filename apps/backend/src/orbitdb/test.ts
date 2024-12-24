import process from 'node:process'

import { faker } from '@faker-js/faker'
import { createLogger } from '@regioni/lib-logger'

import { startOrbitDB, stopOrbitDB } from './orbit'

interface IUser {
  _id: string
  firstName: string
  lastName: string
  email: string
}

const logger = createLogger({
  defaultMeta: {
    service: 'test',
  },
})
// Get DB name and directory from command line
const dbName = process.argv[2] || 'my-database'
const dbDir = process.argv[3] || './.orbitdb/db1'

const dbId = process.argv[4]
  || 'test'

async function main() {
// Create OrbitDB instance
  const orbitdb = await startOrbitDB({
    id: dbId,
    dir: dbDir,
  })
  const { libp2p } = orbitdb.ipfs

  // libp2p
  logger.info('peerId', libp2p.peerId)
  logger.info('multiaddr', libp2p.getMultiaddrs())
  logger.info('protocol', libp2p.getProtocols())

  // Open a database
  const db = await orbitdb.open<IUser, 'documents'>(
    'documents',
    dbName,
    { indexBy: 'email' },
  )

  logger.log(
    'info',
    'db address',
    { address: db.address },
  )

  // Listen for updates
  db.events.addEventListener(
    'update',
    ({ detail: { entry: { id, hash, payload } } }) => {
      return logger.info('onupdate', { id, hash, payload })
    },
  )
  db.events.addEventListener('join', ({ detail: { peerId, heads } }) => {
    return logger.info('join', peerId, heads)
  })
  db.events.addEventListener('drop', () => {
    return logger.info('drop')
  })

  db.sync.events.addEventListener('join', ({ detail: { peerId, heads } }) => {
    return logger.info('sync join', peerId, heads)
  })

  // Add some data
  // await generate(100)
  await db.put({ _id: '12', email: 'test@test.com', firstName: 'test', lastName: 'test' })

  // Get some data
  const value = await db.get('12')

  logger.info('value', value)

  // Iterate over records
  for await (const record of db.iterator({ amount: 1 })) {
    logger.info('record', record)
  }

  // Stop OrbitDB
  await stopOrbitDB(orbitdb)

  async function generate(size: number, chunkSize = 1000) {
    let time = 0
    for (let i = 0; i < size; i += chunkSize) {
      const length = Math.min(chunkSize, size - i)
      const chunk = Array.from({ length }, (_, j) => {
        return {
          _id: (i + (j + 1)).toString(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
        }
      })

      const startTime = performance.now()
      await Promise.all(chunk.map(({
        _id,
        ...value
      }) => {
        return db.put({ _id, ...value })
      }))
      time += performance.now() - startTime
    }

    logger.info('time', `took ${(1000 / time / size).toFixed(2)}op/sec average`)
  }
}

main()
