import { copy } from 'fs-extra'
import { deepStrictEqual, notStrictEqual, strictEqual } from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { rimraf } from 'rimraf'
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from 'vitest'

import type { AccessControllerInstance, IdentityInstance, KeyValueIndexedDatabase, OrbitDBHeliaInstance } from '../../src'

import {
  Identities,
  KeyStore,
  KeyValueIndexed,
  MemoryStorage,
} from '../../src'
import testKeysPath from '../fixtures/test-keys-path'
import createHelia from '../utils/create-helia'

const keysPath = './testkeys'

describe('keyValueIndexed Database', () => {
  let ipfs: OrbitDBHeliaInstance
  let keystore: KeyStore
  let accessController: AccessControllerInstance
  let identities: Identities
  let testIdentity1: IdentityInstance
  let db: KeyValueIndexedDatabase

  const databaseId = 'keyvalue-AAA'

  beforeAll(async () => {
    ipfs = await createHelia()

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore.create({ path: keysPath })
    identities = await Identities.create({ ipfs, keystore })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
  })

  afterAll(async () => {
    if (ipfs) {
      await ipfs.stop()
    }

    if (db) {
      await db.close()
    }

    if (keystore) {
      await keystore.close()
    }

    await rimraf(keysPath)
    await rimraf('./.orbitdb')
    await rimraf('./ipfs1')
  })

  describe('creating a KeyValueIndexed database', () => {
    beforeEach(async () => {
      db = await KeyValueIndexed.create({
        accessController,
        address: databaseId,
        identity: testIdentity1,
        ipfs,
      })
    })

    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('creates a keyvalue store', async () => {
      strictEqual(db.address?.toString(), databaseId)
      strictEqual(db.type, 'keyvalue-indexed')
    })

    it('creates a directory for the persisted index', async () => {
      const expectedPath = path.join('./.orbitdb', `./${db.address}`, '/_index')
      const directoryExists = fs.existsSync(expectedPath)
      strictEqual(directoryExists, true)
    })

    it('returns 0 items when it\'s a fresh database', async () => {
      const all: KeyValueDoc[] = []
      for await (const item of db.iterator()) {
        all.unshift(item)
      }

      strictEqual(all.length, 0)
    })
  })

  describe('keyValueIndexed database API', () => {
    beforeEach(async () => {
      db = await KeyValueIndexed.create({
        accessController,
        address: databaseId,
        identity: testIdentity1,
        ipfs,
      })
    })

    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('sets a key/value pair', async () => {
      const expected = 'zdpuAwr2JfE9TNMoXwupvsssCzemc3g8MTKRfVTG7ZS5gH6md'

      const actual = await db.put('key1', 'value1')
      strictEqual(actual, expected)
    })

    it('puts a key/value pair', async () => {
      const expected = 'zdpuAwr2JfE9TNMoXwupvsssCzemc3g8MTKRfVTG7ZS5gH6md'

      const actual = await db.put('key1', 'value1')
      strictEqual(actual, expected)
    })

    it('gets a key/value pair\'s value', async () => {
      const key = 'key1'
      const expected = 'value1'

      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using put', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.put(key, 'value1')
      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using set', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.put(key, 'value1')
      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using set then put', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.put(key, 'value1')
      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using put then set', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.put(key, 'value1')
      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('deletes a key/value pair', async () => {
      const key = 'key1'

      await db.put(key, 'value1')
      await db.del(key)

      const actual = await db.get(key)
      strictEqual(actual, null)
    })

    it('deletes a non-existent key/value pair', async () => {
      const key = 'this key doesn\'t exist'
      await db.del(key)

      const actual = await db.get(key)
      strictEqual(actual, null)
    })

    it('returns all key/value pairs', async () => {
      const keyvalue = [
        {
          hash: 'zdpuAnpWUWQFo7E7Q4fredrBdHWHTtSzMmo8CG7HRkWCu8Pbq',
          key: 'key1',
          value: 'init',
        },
        {
          hash: 'zdpuAwTM75uy1xbBJzHRHUeYTJR67rhHND1w6EpHVH6ThHdos',
          key: 'key2',
          value: true,
        },
        {
          hash: 'zdpuAvYtscmvsQT7sgsJVsK7Gf7S3HweRJzs2D5TWBqz8wPGq',
          key: 'key3',
          value: 'hello',
        },
        {
          hash: 'zdpuAqAGnfa8eryZZm4z4UHcGQKZe4ACwoe1bwfq1AnJRwcPC',
          key: 'key4',
          value: 'friend',
        },
        {
          hash: 'zdpuAxHZs93Ys31jktM28GCwzrGP2vwuotr7MrSzLacGAS3dS',
          key: 'key5',
          value: '12345',
        },
        {
          hash: 'zdpuAuGJ6UoncMuTjkknG4ySjxvAgkdMiRNecR6nDbLoPFDXX',
          key: 'key6',
          value: 'empty',
        },
        {
          hash: 'zdpuAyi1oGLiYbH2UmRvXdGGC7z1vQYGE8oCvrfUvR5bGx6PN',
          key: 'key7',
          value: 'friend33',
        },
      ]

      for (const { hash, key, value } of Object.values(keyvalue)) {
        await db.put(key, value)
      }

      const all: KeyValueDoc[] = []
      for await (const pair of db.iterator()) {
        all.unshift(pair)
      }

      deepStrictEqual(all, keyvalue)
    })
  })

  describe('iterator', () => {
    beforeAll(async () => {
      db = await KeyValueIndexed.create({
        accessController,
        address: databaseId,
        identity: testIdentity1,
        ipfs,
      })
    })

    afterAll(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('has an iterator function', async () => {
      notStrictEqual(db.iterator, undefined)
      strictEqual(typeof db.iterator, 'function')
    })

    it('returns no documents when the database is empty', async () => {
      const all: KeyValueDoc[] = []
      for await (const { hash, key, value } of db.iterator()) {
        all.unshift({ hash, key, value })
      }
      strictEqual(all.length, 0)
    })

    it('returns all documents when the database is not empty', async () => {
      await db.put('key1', 1)
      await db.put('key2', 2)
      await db.put('key3', 3)
      await db.put('key4', 4)
      await db.put('key5', 5)

      // Add one more document and then delete it to count
      // for the fact that the amount returned should be
      // the amount of actual documents returned and not
      // the oplog length, and deleted documents don't
      // count towards the returned amount.
      await db.put('key6', 6)
      await db.del('key6')

      const all: KeyValueDoc[] = []
      for await (const { hash, key, value } of db.iterator()) {
        all.unshift({ hash, key, value })
      }
      strictEqual(all.length, 5)
    })

    it('returns only the amount of documents given as a parameter', async () => {
      const amount = 3
      const all: KeyValueDoc[] = []
      for await (const { hash, key, value } of db.iterator({ amount })) {
        all.unshift({ hash, key, value })
      }

      strictEqual(all.length, amount)
    })

    it('returns only two documents if amount given as a parameter is 2', async () => {
      const amount = 2
      const all: KeyValueDoc[] = []
      for await (const { hash, key, value } of db.iterator({ amount })) {
        all.unshift({ hash, key, value })
      }
      strictEqual(all.length, amount)
    })

    it('returns only one document if amount given as a parameter is 1', async () => {
      const amount = 1
      const all: KeyValueDoc[] = []
      for await (const { hash, key, value } of db.iterator({ amount })) {
        console.log(key, value, hash)
        all.unshift({ hash, key, value })
      }
      strictEqual(all.length, amount)
    })
  })

  describe('parameters', () => {
    afterAll(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('can use a custom indexStorage', async () => {
      const storage = await MemoryStorage.create()
      db = await KeyValueIndexed.create({
        accessController,
        address: databaseId,
        identity: testIdentity1,
        ipfs,
        storage,
      })

      await db.put('key', 'value')

      let result
      for await (const { hash, key, value } of db.iterator()) {
        result = [key, value]
      }

      deepStrictEqual(result, ['key', 'value'])
    })
  })
})
