import process from 'node:process'

import { createLogger } from '@regioni/lib-logger'

import { startOrbitDB, stopOrbitDB } from './orbit'
import { createRPC } from './rpc'

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

// Create OrbitDB instance
const orbitdb = await startOrbitDB({
  id: dbId,
  directory: dbDir,
})
const { libp2p } = orbitdb.ipfs
// libp2p.
logger.info('peerId', libp2p.peerId)
logger.info('multiaddr', libp2p.getMultiaddrs())
logger.info('protocol', libp2p.getProtocols())
// logger.log('info', { lib2p2: JSON.stringify(orbitdb.ipfs.libp2p) })
interface IUser {
  _id: string
  firstName: string
  lastName: string
  email: string
}

// Open a database
const db = await orbitdb.open<IUser, 'documents'>(dbName, {
  type: 'documents',
})

logger.log('info', { address: db.address })

// Listen for updates
db.events.on(
  'update',
  ({ id, hash, payload: { key, op } }) => {
    return logger.info('onupdate', { id, hash, op, key })
  },
)
db.events.on('join', (peerId, _heads) => {
  return logger.info('join', peerId)
})
db.events.on('drop', () => {
  return logger.info('drop')
})

// Add some data
// await generate(10000)

// Get some data
const value = await db.get('12')

logger.info('value', value)

// Iterate over records
for await (const record of db.iterator({ amount: 1 })) {
  logger.info('record', record)
}

// Stop OrbitDB
// await stopOrbitDB(orbitdb)

// async function generate(size: number, chunkSize = 1000) {
//   let time = 0
//   for (let i = 0; i < size; i += chunkSize) {
//     const length = Math.min(chunkSize, size - i)
//     const chunk = Array.from({ length }, (_, j) => {
//       return {
//         _id: (i + (j + 1)).toString(),
//         // firstName: faker.person.firstName(),
//         // lastName: faker.person.lastName(),
//         // email: faker.internet.email(),
//         // company: faker.company.name(),
//         // phone: faker.phone.number(),
//         // value: faker.lorem.paragraphs({ min: 2, max: 5 }),
//       }
//     })

//     const startTime = performance.now()
//     await Promise.all(chunk.map(db.put))
//     time += performance.now() - startTime
//   }

//   logger.info('time', `took ${(1000 / time / size).toFixed(2)}op/sec average`)
// }
