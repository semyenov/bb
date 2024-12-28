import { faker } from '@faker-js/faker'
import process from 'node:process'

import { createLogger } from '@/libs/logger'

import { startOrbitDB, stopOrbitDB } from './orbit'

const logger = createLogger({
  defaultMeta: {
    service: 'test',
  },
})
// Get DB name and directory from command line
const dbName = process.argv[2] || 'my-database'
const dbDir = process.argv[3] || './.orbitdb/db1'

const dbId = process.argv[4]
  || 'zdpuAsxVFKAoY6z8LnLsUtTKkGB4deEcXmhyAEbwkefaLsXR6'

async function main() {
// Create OrbitDB instance
  const orbitdb = await startOrbitDB({
    dir: dbDir,
    id: dbId,
  })
  const { libp2p } = orbitdb.ipfs
  // libp2p.
  logger.info('peerId', libp2p.peerId)
  logger.info('multiaddr', libp2p.getMultiaddrs())
  logger.info('protocol', libp2p.getProtocols())
  // logger.log('info', { lib2p2: JSON.stringify(orbitdb.ipfs.libp2p) })
  interface IUser {
    _id: string
    email: string
    firstName: string
    lastName: string
  }

  // Open a database
  const db = await orbitdb.open<IUser, 'documents'>('documents', dbName, {
    indexBy: 'email',
    type: 'documents',
  })

  logger.log('info', { address: db.address })

  // Listen for updates
  db.events.addEventListener(
    'update',
    ({ detail: { entry: { hash, id, payload } } }) => {
      return logger.info('onupdate', { hash, id, payload })
    },
  )
  db.events.addEventListener('join', ({ detail: { heads, peerId } }) => {
    return logger.info('join', peerId, heads)
  })
  db.events.addEventListener('drop', () => {
    return logger.info('drop')
  })

  db.sync.events.addEventListener('join', ({ detail: { heads, peerId } }) => {
    return logger.info('sync join', peerId, heads)
  })

  // Add some data
  await generate(100)
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
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
        }
      })

      const startTime = performance.now()
      await Promise.all(chunk.map(db.put))
      time += performance.now() - startTime
    }

    logger.info('time', `took ${(1000 / time / size).toFixed(2)}op/sec average`)
  }
}

main()
