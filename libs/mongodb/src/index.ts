import consola from 'consola'
import { MongoClient } from 'mongodb'

const logger = consola.withTag('mongodb')
export async function createMongoDBStore() {
  const client = new MongoClient('mongodb://root:example@mongodb:27017')
  await client.connect()

  const db = client.db('testSozdev')
  logger.debug('Connected to MongoDB', db.databaseName)

  return {
    data: db.collection('data'),
  }
}
