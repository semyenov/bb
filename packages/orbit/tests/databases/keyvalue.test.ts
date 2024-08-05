import { deepStrictEqual, notStrictEqual, strictEqual } from 'node:assert'

import { copy } from 'fs-extra'
import { rimraf } from 'rimraf'
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from 'vitest'

import {
  Identities,
  KeyStore,
  KeyValue,
} from '../../src'
import testKeysPath from '../fixtures/test-keys-path.js'
import createHelia from '../utils/create-helia.js'

const keysPath = './testkeys'

describe('keyValue Database', () => {
  let ipfs: IPFS
  let keystore: KeyStoreInstance
  let accessController: AccessControllerInstance
  let identities: IdentitiesInstance
  let testIdentity1: IdentityInstance
  let db: KeyValueInstance

  const databaseId = 'keyvalue-AAA'

  beforeAll(async () => {
    ipfs = await createHelia()

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore.create({ path: keysPath })
    identities = await Identities.create({ keystore, ipfs })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
  })

  afterAll(async () => {
    if (ipfs) {
      await ipfs.stop()
    }

    if (keystore) {
      await keystore.close()
    }

    await rimraf(keysPath)
    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
  })

  describe('creating a KeyValue.createatabase', () => {
    beforeEach(async () => {
      db = await KeyValue.create({
        ipfs,
        identity: testIdentity1,
        address: databaseId,
        accessController,
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
      strictEqual(db.type, 'keyvalue')
    })

    it('returns 0 items when it\'s a fresh database', async () => {
      const all: KeyValueDoc[] = []
      for await (const item of db.iterator()) {
        all.unshift(item)
      }

      strictEqual(all.length, 0)
    })
  })

  describe('keyValue database API', () => {
    beforeEach(async () => {
      db = await KeyValue.create({
        ipfs,
        identity: testIdentity1,
        address: databaseId,
        accessController,
      })
    })

    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('sets a key/value pair', async () => {
      const expected = 'zdpuAqnAtcpNJEheFnHhuRMhLHF8BCGFYGfNdLjq6ZDGd7ChP'

      const actual = await db.set('key1', 'value1')
      strictEqual(actual, expected)
    })

    it('puts a key/value pair', async () => {
      const expected = 'zdpuAqnAtcpNJEheFnHhuRMhLHF8BCGFYGfNdLjq6ZDGd7ChP'

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

      await db.set(key, 'value1')
      await db.set(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using set then put', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.set(key, 'value1')
      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using put then set', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.put(key, 'value1')
      await db.set(key, expected)
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
          hash: 'zdpuB2SnkwZu99bTxtZp8yWzmAjRiUaC1pVvdPwr352pKx3UP',
          key: 'key1',
          value: 'init',
        },
        {
          hash: 'zdpuAoM4tRDVbmsN7vh8Vfx3Xtz6xGyUiW6Egpy7pk3yronBH',
          key: 'key2',
          value: true,
        },
        {
          hash: 'zdpuAoF3ydfUnFcW7o6EphroNY6mHtvwNQPBVDpVugNi759Gu',
          key: 'key3',
          value: 'hello',
        },
        {
          hash: 'zdpuAoMEbfUQR5Rd9mMsHn2mBQQfDoZE4u5PhVhyZ8rCVZGE1',
          key: 'key4',
          value: 'friend',
        },
        {
          hash: 'zdpuAxYZNdhV12XiTCmTyGBMWnzExXLoKFDgzBLDXbZ7mz3qw',
          key: 'key5',
          value: '12345',
        },
        {
          hash: 'zdpuAw9rAozJFZoPpPuyhebosgVbWmicm4tRm3HFTExH8bTP8',
          key: 'key6',
          value: 'empty',
        },
        {
          hash: 'zdpuAr5HcJrrqQrqnqkfdKR1XcN42EaLiiS9SWKYvmc1s1zAV',
          key: 'key7',
          value: 'friend33',
        },
      ]

      for (const { key, value } of Object.values(keyvalue)) {
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
      db = await KeyValue.create({
        ipfs,
        identity: testIdentity1,
        address: databaseId,
        accessController,
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

    it('returns no key/value pairs when the database is empty', async () => {
      const all: KeyValueDoc[] = []
      for await (const { key, value, hash } of db.iterator()) {
        all.unshift({ key, value, hash })
      }
      strictEqual(all.length, 0)
    })

    it('returns all key/value pairs when the database is not empty', async () => {
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
      for await (const { key, value, hash } of db.iterator()) {
        all.unshift({ key, value, hash })
      }
      strictEqual(all.length, 5)
    })

    it('returns only the amount of key/value pairs given as a parameter', async () => {
      const amount = 3
      const all: KeyValueDoc[] = []
      for await (const { key, value, hash } of db.iterator({ amount })) {
        console.log({ key, value, hash })
        all.unshift({ key, value, hash })
      }
      strictEqual(all.length, amount)
    })

    it('returns only two key/value pairs if amount given as a parameter is 2', async () => {
      const amount = 2
      const all: KeyValueDoc[] = []
      for await (const { key, value, hash } of db.iterator({ amount })) {
        all.unshift({ key, value, hash })
      }
      strictEqual(all.length, amount)
    })

    it('returns only one key/value pairs if amount given as a parameter is 1', async () => {
      const amount = 1
      const all: KeyValueDoc[] = []
      for await (const { key, value, hash } of db.iterator({ amount })) {
        all.unshift({ key, value, hash })
      }
      strictEqual(all.length, amount)
    })
  })
})
