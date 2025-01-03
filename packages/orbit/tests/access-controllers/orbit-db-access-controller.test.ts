// eslint-disable-next-line ts/ban-ts-comment
// @ts-nocheck
import { deepStrictEqual, notStrictEqual, strictEqual } from 'node:assert'
import { rimraf } from 'rimraf'
import { afterAll, beforeAll, describe, it } from 'vitest'

import {
  Identities,
  KeyStore,
  OrbitDB,
  OrbitDBAccessController,
} from '../../src'
import connectPeers from '../utils/connect-nodes'
import createHelia from '../utils/create-helia'

const dbPath1 = './orbitdb/tests/orbitdb-access-controller/1'
const dbPath2 = './orbitdb/tests/orbitdb-access-controller/2'

describe('orbitDBAccessController', () => {
  let ipfs1: IPFS, ipfs2: IPFS
  let orbitdb1: OrbitDBInstance, orbitdb2: OrbitDBInstance
  let identities1: IdentitiesInstance,
    identities2: IdentitiesInstance,
    testIdentity1: IdentityInstance,
    testIdentity2: IdentityInstance

  beforeAll(async () => {
    ;[ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    const keystore1 = await KeyStore.create({ path: `${dbPath1}/keys` })
    const keystore2 = await KeyStore.create({ path: `${dbPath2}/keys` })

    identities1 = await Identities.create({ ipfs: ipfs1, keystore: keystore1 })
    identities2 = await Identities.create({ ipfs: ipfs2, keystore: keystore2 })

    testIdentity1 = await identities1.createIdentity({ id: 'userA' })
    testIdentity2 = await identities2.createIdentity({ id: 'userB' })

    orbitdb1 = await OrbitDB.create({
      directory: dbPath1,
      id: 'userA',
      identities: identities1,
      ipfs: ipfs1,
    })
    orbitdb2 = await OrbitDB.create({
      directory: dbPath2,
      id: 'userB',
      identities: identities2,
      ipfs: ipfs2,
    })
  })

  afterAll(async () => {
    if (orbitdb1) {
      await orbitdb1.stop()
    }

    if (orbitdb2) {
      await orbitdb2.stop()
    }

    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  describe('default write access', () => {
    let accessController: OrbitDBAccessController

    beforeAll(async () => {
      accessController = await OrbitDBAccessController.create({
        identities: identities1,
        orbitdb: orbitdb1,
      })
    })

    it('creates an access controller', () => {
      notStrictEqual(accessController, null)
      notStrictEqual(accessController, undefined)
    })

    it('sets the controller type', () => {
      strictEqual(accessController.type, 'orbitdb')
    })

    it('sets default capabilities', async () => {
      const expected: Record<string, Set<string>> = {}
      expected.admin = new Set([testIdentity1.id])

      deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('allows owner to append after creation', async () => {
      const mockEntry = {
        identity: testIdentity1.hash,
        // ...
        // doesn't matter what we put here, only identity is used for the check
      }
      const canAppend = await accessController.canAppend(
        mockEntry as Entry.Instance,
      )
      strictEqual(canAppend, true)
    })
  })

  describe('grant', () => {
    let accessController: OrbitDBAccessController

    beforeAll(async () => {
      accessController = await OrbitDBAccessController.create({
        address: 'testdb/add',
        identities: identities1,
        orbitdb: orbitdb1,
      })
    })

    it('adds a capability', async () => {
      try {
        await accessController.grant('write', testIdentity1.id)
      }
      catch (error) {
        strictEqual(error, null)
      }

      const expected: Record<string, Set<string>> = {}
      expected.admin = new Set([testIdentity1.id])
      expected.write = new Set([testIdentity1.id])
      deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('adds more capabilities', async () => {
      try {
        await accessController.grant('read', 'ABCD')
        await accessController.grant('delete', 'ABCD')
      }
      catch (error) {
        strictEqual(error, null)
      }

      const expected: Record<string, any> = {}
      expected.admin = new Set([testIdentity1.id])
      expected.write = new Set([testIdentity1.id])
      expected.read = new Set(['ABCD'])
      expected.delete = new Set(['ABCD'])
      console.log('capabilities', await accessController.capabilities())
      deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('emit \'update\' event when a capability was added', async () => {
      let update = false

      accessController.events.addEventListener('update', (_entry) => {
        update = true
      })

      await accessController.grant('read', 'AXES')

      strictEqual(update, true)
    })

    it('can append after acquiring capability', async () => {
      try {
        await accessController.grant('write', testIdentity1.id)
        await accessController.grant('write', testIdentity2.id)
      }
      catch (error) {
        strictEqual(error, null)
      }

      const mockEntry1 = {
        identity: testIdentity1.hash,
      } as Entry.Instance

      const mockEntry2 = {
        identity: testIdentity2.hash,
      } as Entry.Instance

      const canAppend1 = await accessController.canAppend(mockEntry1)

      const accessController2 = await OrbitDBAccessController.create({
        address: 'testdb/add',
        identities: identities2,
        orbitdb: orbitdb2,
      })
      const canAppend2 = await accessController2.canAppend(mockEntry2)

      strictEqual(canAppend1, true)
      strictEqual(canAppend2, true)
    })
  })

  describe('revoke', () => {
    let accessController: OrbitDBAccessController

    beforeAll(async () => {
      accessController = await OrbitDBAccessController.create({
        address: 'testdb/remove',
        identities: identities1,
        orbitdb: orbitdb1,
      })
    })

    it('removes a capability', async () => {
      try {
        await accessController.grant('write', testIdentity1.id)
        await accessController.grant('write', 'AABB')
        await accessController.revoke('write', 'AABB')
      }
      catch (error) {
        strictEqual(error, null)
      }

      const expected: Record<string, any> = {}
      expected.admin = new Set([testIdentity1.id])
      expected.write = new Set([testIdentity1.id])

      deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('can remove the creator\'s write access', async () => {
      try {
        await accessController.revoke('write', testIdentity1.id)
      }
      catch (error) {
        strictEqual(error, null)
      }

      const expected: Record<string, any> = {}
      expected.admin = new Set([testIdentity1.id])

      deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('can\'t remove the creator\'s admin access', async () => {
      try {
        await accessController.revoke('admin', testIdentity1.id)
      }
      catch (error) {
        strictEqual(error, null)
      }

      const expected: Record<string, any> = {}
      expected.admin = new Set([testIdentity1.id])

      deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('removes more capabilities', async () => {
      try {
        await accessController.grant('read', 'ABCD')
        await accessController.grant('delete', 'ABCD')
        await accessController.grant('write', testIdentity1.id)
        await accessController.revoke('read', 'ABCDE')
        await accessController.revoke('delete', 'ABCDE')
      }
      catch (error) {
        strictEqual(error, null)
      }

      const expected: Record<string, any> = {}
      expected.admin = new Set([testIdentity1.id])
      expected.write = new Set([testIdentity1.id])
      expected.read = new Set(['ABCD'])
      expected.delete = new Set(['ABCD'])
      console.log('expected!!', expected)

      deepStrictEqual(await accessController.capabilities(), expected)
    })

    it('can\'t append after revoking capability', async () => {
      try {
        await accessController.grant('write', testIdentity2.id)
        await accessController.revoke('write', testIdentity2.id)
      }
      catch (error) {
        strictEqual(error, null)
      }
      const mockEntry1 = {
        identity: testIdentity1.hash,
      }
      const mockEntry2 = {
        identity: testIdentity2.hash,
      }
      const canAppend = await accessController.canAppend(mockEntry1)
      const noAppend = await accessController.canAppend(mockEntry2)
      strictEqual(canAppend, true)
      strictEqual(noAppend, false)
    })

    it('emits \'update\' event when a capability was removed', async () => {
      await accessController.grant('admin', 'cats')
      await accessController.grant('admin', 'dogs')

      let update = false

      accessController.events.addEventListener('update', (_entry) => {
        update = true
      })

      await accessController.revoke('admin', 'cats')

      strictEqual(update, true)
    })
  })
})
// TODO: use two separate peers for testing the AC
// TODO: add tests for revocation correctness with a database (integration tests)
