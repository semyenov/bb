import { copy } from 'fs-extra'
import { deepStrictEqual, strictEqual } from 'node:assert'
import { existsSync, readdirSync } from 'node:fs'
import Path from 'node:path'
import { rimraf } from 'rimraf'
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from 'vitest'

import type {
  AccessControllerInstance,
  DatabaseOperation,
  EntryInstance,
  StorageInstance,
} from '../src'
import type { IdentityInstance } from '../src/identities/identity'
import type { OrbitDBHeliaInstance } from '../src/vendor'

import {
  Database,
  Entry,
  Identities,
  KeyStore,
  LevelStorage,
  MemoryStorage,
} from '../src'
import testKeysPath from './fixtures/test-keys-path'
import createHelia from './utils/create-helia'

const keysPath = './testkeys'

describe('database', () => {
  // this.timeout(30000)

  let ipfs: OrbitDBHeliaInstance
  let keystore: KeyStore
  let identities: Identities
  let testIdentity: IdentityInstance
  let db: Database

  const databaseId = 'database-AAA'

  const accessController = {
    canAppend: async (entry: EntryInstance) => {
      const identity1 = await identities.getIdentity(entry.identity as string)

      return identity1?.id === testIdentity.id
    },
  }

  beforeAll(async () => {
    ipfs = await createHelia() as unknown as OrbitDBHeliaInstance
    await copy(testKeysPath, keysPath)
    keystore = await KeyStore.create({ path: keysPath })
    identities = await Identities.create({ ipfs, keystore })
    testIdentity = await identities.createIdentity({ id: 'userA' })
  })

  afterEach(async () => {
    await rimraf('./.orbitdb')
  })

  afterAll(async () => {
    if (ipfs) {
      await ipfs.stop()
    }

    if (keystore) {
      await keystore.close()
    }

    await rimraf(keysPath)
    await rimraf('./ipfs1')
  })

  it('adds an operation', async () => {
    db = await Database.create({
      accessController: accessController as AccessControllerInstance,
      address: databaseId,
      dir: './.orbitdb',
      identity: testIdentity,
      ipfs,
    })
    const expected = 'zdpuAwhx6xVpnMPUA7Q4JrvZsyoti5wZ18iDeFwBjPAwsRNof'
    const op = { key: '1', op: 'PUT', value: 'record 1 on db 1' }
    const actual = await db.addOperation(op as DatabaseOperation<unknown>)

    deepStrictEqual(actual, expected)

    await db.close()
  })

  describe('options', () => {
    it('uses default directory for headsStorage', async () => {
      db = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.orbitdb',
        identity: testIdentity,
        ipfs,
      })
      const op = { key: '1', op: 'PUT', value: 'record 1 on db 1' }
      const hash = await db.addOperation(op as DatabaseOperation<unknown>)

      const headsPath = Path.join(
        './.orbitdb/databases/',
        `${databaseId}/`,
        '/log/_heads/',
      )

      console.log('headsPath', headsPath)
      console.log('process.cwd', readdirSync('./.orbitdb'))

      strictEqual(await existsSync(headsPath), true)

      await db.close()

      const headsStorage = await LevelStorage.create({ path: headsPath })

      deepStrictEqual(
        (await Entry.decode(await headsStorage.get(hash) as Uint8Array)).payload,
        op,
      )

      await headsStorage.close()

      await rimraf(headsPath)
    })

    it('uses given directory for headsStorage', async () => {
      db = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './custom-directory',
        identity: testIdentity,
        ipfs,
      })
      const op = { key: '1', op: 'PUT', value: 'record 1 on db 1' }
      const hash = await db.addOperation(op as DatabaseOperation<unknown>)

      const headsPath = Path.join(
        './custom-directory/',
        `${databaseId}/`,
        '/log/_heads/',
      )

      strictEqual(await existsSync(headsPath), true)

      await db.close()

      const headsStorage = await LevelStorage.create({ path: headsPath })

      deepStrictEqual(
        (await Entry.decode(await headsStorage.get(hash) as Uint8Array)).payload,
        op,
      )

      await headsStorage.close()

      await rimraf(headsPath)
      await rimraf('./custom-directory')
    })

    it('uses given MemoryStorage for headsStorage', async () => {
      const headsStorage = await MemoryStorage.create()
      db = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.orbitdb',
        headsStorage: headsStorage as StorageInstance<Uint8Array>,
        identity: testIdentity,
        ipfs,
      })
      const op = { key: '1', op: 'PUT', value: 'record 1 on db 1' }
      const hash = await db.addOperation(op as DatabaseOperation<unknown>)

      deepStrictEqual(
        (await Entry.decode(await headsStorage.get(hash) as Uint8Array)).payload,
        op,
      )

      await db.close()
    })

    it('uses given MemoryStorage for entryStorage', async () => {
      const entryStorage = await MemoryStorage.create()
      db = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.orbitdb',
        entryStorage: entryStorage as StorageInstance<Uint8Array>,
        identity: testIdentity,
        ipfs,
      })
      const op = { key: '1', op: 'PUT', value: 'record 1 on db 1' }
      const hash = await db.addOperation(op as DatabaseOperation<unknown>)

      deepStrictEqual(
        (await Entry.decode(await entryStorage.get(hash) as Uint8Array)).payload,
        op,
      )

      await db.close()
    })
  })

  describe('events', () => {
    beforeEach(async () => {
      db = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.orbitdb',
        identity: testIdentity,
        ipfs,
      })
    })

    it('emits \'close\' when the database is closed', async () => {
      let closed = false
      const onClose = () => {
        closed = true
      }

      db.events.addEventListener('close', onClose)

      await db.close()

      strictEqual(closed, true)
    })

    it('emits \'drop\' when the database is dropped', async () => {
      let dropped = false
      const onDrop = () => {
        dropped = true
      }

      db.events.addEventListener('drop', onDrop)

      await db.drop()

      strictEqual(dropped, true)

      await db.close()
    })
  })
})
