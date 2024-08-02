import { deepStrictEqual } from 'node:assert'

import {
  Events,
  Identities,
  KeyStore,
} from '@orbitdb/core'
import { copy } from 'fs-extra'
import { rimraf } from 'rimraf'
import { after, afterEach, before, describe, it } from 'vitest'

import testKeysPath from '../../fixtures/test-keys-path.js'
import connectPeers from '../../utils/connect-nodes.js'
import createHelia from '../../utils/create-helia.js'
import waitFor from '../../utils/wait-for.js'

import type {
  Entry,
  EventsDoc,
  EventsInstance,
  IPFS,
  IdentitiesInstance,
  IdentityInstance,
  KeyStoreInstance,
} from '@orbitdb/core'

const keysPath = './testkeys'

describe('events Database Replication', function () {
  // @ts-ignore
  this.timeout(30000)

  let ipfs1: IPFS, ipfs2: IPFS
  let keystore: KeyStoreInstance
  let identities: IdentitiesInstance
  let testIdentity1: IdentityInstance, testIdentity2: IdentityInstance
  let db1: EventsInstance, db2: EventsInstance

  const databaseId = 'events-AAA'

  const accessController = {
    canAppend: async (entry: Entry.Instance) => {
      const identity = await identities.getIdentity(entry.identity)

      return identity.id === testIdentity1.id
    },
  }

  const expected = [
    'init',
    true,
    'hello',
    'friend',
    12345,
    'empty',
    '',
    'friend33',
  ]

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore.create({ path: keysPath })
    identities = await Identities.create({ keystore, ipfs })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
    testIdentity2 = await identities.createIdentity({ id: 'userB' })
  })

  after(async () => {
    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    if (keystore) {
      await keystore.close()
    }

    await rimraf(keysPath)
    await rimraf('./orbitdb1')
    await rimraf('./orbitdb2')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  afterEach(async () => {
    if (db1) {
      await db1.drop()
      await db1.close()
      db1 = null as unknown as EventsInstance
    }
    if (db2) {
      await db2.drop()
      await db2.close()
      db2 = null as unknown as EventsInstance
    }
  })

  it('replicates a database', async () => {
    let replicated = false
    let expectedEntryHash: string | null = null

    const onError = (err) => {
      console.error(err)
    }

    db1 = await Events()({
      ipfs: ipfs1,
      identity: testIdentity1,
      address: databaseId,
      accessController,
      directory: './orbitdb1',
    })
    db2 = await Events()({
      ipfs: ipfs2,
      identity: testIdentity2,
      address: databaseId,
      accessController,
      directory: './orbitdb2',
    })

    db2.events.on('join', (peerId, heads) => {
      replicated = expectedEntryHash !== null && heads.map((e) => {
        return e.hash
      })
        .includes(expectedEntryHash)
    })
    db2.events.on('update', (entry) => {
      replicated = expectedEntryHash !== null && entry.hash === expectedEntryHash
    })

    db2.events.on('error', onError)
    db1.events.on('error', onError)

    await db1.add(expected[0])
    await db1.add(expected[1])
    await db1.add(expected[2])
    await db1.add(expected[3])
    await db1.add(expected[4])
    await db1.add(expected[5])
    await db1.add(expected[6])
    expectedEntryHash = await db1.add(expected[7])

    await waitFor(() => {
      return replicated
    }, () => {
      return true
    })

    const all2: EventsDoc[] = []
    for await (const event of db2.iterator()) {
      all2.unshift(event)
    }
    deepStrictEqual(all2.map((e) => {
      return e.value
    }), expected)

    const all1 = await db2.all()
    deepStrictEqual(all1.map((e) => {
      return e.value
    }), expected)
  })

  it('loads the database after replication', async () => {
    let replicated = false
    let expectedEntryHash: string | null = null

    db1 = await Events()({
      ipfs: ipfs1,
      identity: testIdentity1,
      address: databaseId,
      accessController,
      directory: './orbitdb1',
    })
    db2 = await Events()({
      ipfs: ipfs2,
      identity: testIdentity2,
      address: databaseId,
      accessController,
      directory: './orbitdb2',
    })

    db2.events.on('join', (peerId, heads) => {
      replicated = expectedEntryHash !== null && heads.map((e) => {
        return e.hash
      })
        .includes(expectedEntryHash)
    })
    db2.events.on('update', (entry) => {
      replicated = expectedEntryHash !== null && entry.hash === expectedEntryHash
    })

    db2.events.on('error', (err) => {
      console.error(err)
    })
    db1.events.on('error', (err) => {
      console.error(err)
    })

    await db1.add(expected[0])
    await db1.add(expected[1])
    await db1.add(expected[2])
    await db1.add(expected[3])
    await db1.add(expected[4])
    await db1.add(expected[5])
    await db1.add(expected[6])
    expectedEntryHash = await db1.add(expected[7])

    await waitFor(() => {
      return replicated
    }, () => {
      return true
    })

    await db1.drop()
    await db1.close()
    db1 = null as unknown as EventsInstance

    await db2.close()

    db2 = await Events()({
      ipfs: ipfs2,
      identity: testIdentity2,
      address: databaseId,
      accessController,
      directory: './orbitdb2',
    })

    const all2: EventsDoc[] = []
    for await (const event of db2.iterator()) {
      all2.unshift(event)
    }
    deepStrictEqual(all2.map((e) => {
      return e.value
    }), expected)

    const all1 = await db2.all()
    deepStrictEqual(all1.map((e) => {
      return e.value
    }), expected)
  })
})
