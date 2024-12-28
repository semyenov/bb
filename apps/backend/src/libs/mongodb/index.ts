import { MongoClient } from 'mongodb'

export async function createMongoDBStore() {
  const client = new MongoClient('mongodb://root:example@mongodb:27017')
  await client.connect()

  const db = client.db('testSozdev')

  return {
    data: db.collection('data'),
  }
}
