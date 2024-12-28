import { copy } from 'fs-extra'
import { deepEqual, strictEqual } from 'node:assert'
import { rimraf } from 'rimraf'
import { afterEach, beforeEach, describe, it } from 'vitest'

import type {
  AccessControllerInstance,
  StorageInstance,
} from '../src'
import type { EntryInstance } from '../src/oplog'

import {
  ComposedStorage,
  Database,
  Identities,
  IPFSBlockStorage,
  KeyStore,
  MemoryStorage,
} from '../src'
import testKeysPath from './fixtures/test-keys-path'
import { connectIpfsNodes } from './utils/connect-nodes'
import createHelia from './utils/create-helia'
import waitFor from './utils/wait-for'

const keysPath = './.out/testkeys'

describe('database - Replication', () => {
  let ipfs1: any, ipfs2: any
  let keystore: KeyStore
  let identities: Identities
  let identities2: Identities
  let testIdentity1: any, testIdentity2: any
  let db1: Database, db2: Database

  const databaseId = 'documents-AAA'

  const accessController = {
    canAppend: async (entry: EntryInstance) => {
      const identity1 = entry.identity && await identities.getIdentity(entry.identity)
      const identity2 = entry.identity && await identities2.getIdentity(entry.identity)

      if (!identity1 || !identity2) {
        return false
      }

      return (
        identity1?.id === testIdentity1.id || identity2?.id === testIdentity2.id
      )
    },
  }

  beforeEach(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectIpfsNodes(ipfs1, ipfs2)

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore.create({ path: keysPath })
    identities = await Identities.create({ ipfs: ipfs1, keystore })
    identities2 = await Identities.create({ ipfs: ipfs2, keystore })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
    testIdentity2 = await identities2.createIdentity({ id: 'userB' })
  })

  afterEach(async () => {
    if (db1) {
      await db1.drop()
      await db1.close()

      await rimraf('./.out/orbitdb1')
    }
    if (db2) {
      await db2.drop()
      await db2.close()

      await rimraf('./.out/orbitdb2')
    }

    await rimraf('./.out')

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
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  describe('replicate across peers', () => {
    beforeEach(async () => {
      db1 = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.out/orbitdb1',
        identity: testIdentity1,
        ipfs: ipfs1,
        meta: {},
        name: 'test',
      })
    })

    it('replicates databases across two peers', async () => {
      let replicated = false
      let expectedEntryHash: null | string = null
      const onConnected = (customEvent: CustomEvent) => {
        const { heads, peerId } = customEvent.detail
        console.log('onConnected', peerId)
        replicated = expectedEntryHash !== null
        && heads.map((e: { hash: string }) => {
          return e.hash
        })
          .includes(expectedEntryHash)
      }

      const onUpdate = (customEvent: CustomEvent) => {
        const { entry } = customEvent.detail
        console.log('onUpdate: entry', entry)
        replicated = expectedEntryHash !== null
        && entry.hash === expectedEntryHash
      }

      db2 = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.out/orbitdb2',
        identity: testIdentity2,
        ipfs: ipfs2,
        name: 'test2',
      })

      db2.sync.events.addEventListener('join', onConnected)
      db2.events.addEventListener('update', onUpdate)

      await db1.addOperation({ key: '1', op: 'PUT', value: 'record 1 on db 1' })
      await db1.addOperation({ key: '2', op: 'PUT', value: 'record 2 on db 1' })
      await db1.addOperation({ key: '3', op: 'PUT', value: 'record 3 on db 1' })

      expectedEntryHash = await db1.addOperation({
        key: '4',
        op: 'PUT',
        value: 'record 4 on db 1',
      })

      await waitFor(
        async () => {
          return replicated
        },
        async () => {
          return true
        },
      )

      console.log('added record 1 on db 1')
      const all1: EntryInstance[] = []
      for await (const item of db1.log.iterator()) {
        all1.unshift(item)
      }

      const all2: EntryInstance[] = []
      for await (const item of db2.log.iterator()) {
        all2.unshift(item)
      }

      deepEqual(all1, all2)
    })

    it('replicates databases across two peers with delays', async () => {
      let replicated = false
      let expectedEntryHash: null | string = null

      const onConnected = (event: CustomEvent) => {
        const { heads, peerId } = event.detail
        console.log('peerId', peerId)
        replicated = expectedEntryHash !== null
        && heads.map((e: { hash: string }) => {
          return e.hash
        })
          .includes(expectedEntryHash)
      }

      const onUpdate = (event: CustomEvent) => {
        const { entry } = event.detail
        replicated = expectedEntryHash !== null
        && entry.hash === expectedEntryHash
      }

      db2 = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.out/orbitdb2',
        identity: testIdentity2,
        ipfs: ipfs2,
      })

      db2.sync.events.addEventListener('join', onConnected)
      db2.events.addEventListener('update', onUpdate)

      await db1.addOperation({
        key: '1',
        op: 'PUT',
        value: 'record 1 on db 1',
      })

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          return resolve()
        }, 1000)
      })

      await db1.addOperation({
        key: '2',
        op: 'PUT',
        value: 'record 2 on db 1',
      })
      await db1.addOperation({
        key: '3',
        op: 'PUT',
        value: 'record 3 on db 1',
      })

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          return resolve()
        }, 1000)
      })

      expectedEntryHash = await db1.addOperation({
        key: '4',
        op: 'PUT',
        value: 'record 4 on db 1',
      })

      await waitFor(
        async () => {
          return replicated
        },
        async () => {
          return true
        },
      )

      const all1: EntryInstance[] = []
      for await (const item of db1.log.iterator()) {
        all1.unshift(item)
      }

      const all2: EntryInstance[] = []
      for await (const item of db2.log.iterator()) {
        all2.unshift(item)
      }

      deepEqual(all1, all2)
    })

    it('adds an operation before db2 is instantiated', async () => {
      let connected = false

      const onConnected = () => {
        connected = true
      }

      await db1.addOperation({
        key: '1',
        op: 'PUT',
        value: 'record 1 on db 1',
      })

      db2 = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.out/orbitdb2',
        identity: testIdentity2,
        ipfs: ipfs2,
      })

      db2.sync.events.addEventListener('join', onConnected)

      await waitFor(
        async () => {
          return connected
        },
        async () => {
          return true
        },
      )

      const all1: EntryInstance[] = []
      for await (const item of db1.log.iterator()) {
        all1.unshift(item)
      }

      const all2: EntryInstance[] = []
      for await (const item of db2.log.iterator()) {
        all2.unshift(item)
      }

      deepEqual(all1, all2)
    })
  })

  describe('options', () => {
    it('uses given ComposedStorage with MemoryStorage/IPFSBlockStorage for entryStorage', async () => {
      const storage1 = await ComposedStorage.create({
        storage1: await MemoryStorage.create(),
        storage2: await IPFSBlockStorage.create({ ipfs: ipfs1, pin: true }),
      }) as StorageInstance<Uint8Array<ArrayBufferLike>>
      const storage2 = await ComposedStorage.create({
        storage1: await MemoryStorage.create(),
        storage2: await IPFSBlockStorage.create({ ipfs: ipfs2, pin: true }),
      }) as StorageInstance<Uint8Array<ArrayBufferLike>>
      db1 = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.out/orbitdb1',
        entryStorage: storage1 as StorageInstance<Uint8Array<ArrayBufferLike>>,
        identity: testIdentity1,
        ipfs: ipfs1,
      })
      db2 = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.out/orbitdb2',
        entryStorage: storage2 as StorageInstance<Uint8Array<ArrayBufferLike>>,
        identity: testIdentity2,
        ipfs: ipfs2,
      })

      let connected1 = false
      let connected2 = false

      const onConnected1 = () => {
        connected1 = true
      }

      const onConnected2 = () => {
        connected2 = true
      }

      db1.sync.events.addEventListener('join', onConnected1)
      db2.sync.events.addEventListener('join', onConnected2)

      await db1.addOperation({ key: String(1), op: 'PUT', value: 'record 1 on db 1' })
      await db1.addOperation({ key: String(2), op: 'PUT', value: 'record 2 on db 1' })
      await db1.addOperation({ key: String(3), op: 'PUT', value: 'record 3 on db 1' })
      await db1.addOperation({ key: String(4), op: 'PUT', value: 'record 4 on db 1' })

      await waitFor(
        async () => {
          return connected1
        },
        async () => {
          return true
        },
      )
      await waitFor(
        async () => {
          return connected2
        },
        async () => {
          return true
        },
      )

      const all1: EntryInstance[] = []
      for await (const item of db1.log.iterator()) {
        all1.unshift(item)
      }

      const all2: EntryInstance[] = []
      for await (const item of db2.log.iterator()) {
        all2.unshift(item)
      }

      deepEqual(all1, all2)
    })
  })

  describe('events', () => {
    beforeEach(async () => {
      db1 = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.out/orbitdb1',
        identity: testIdentity1,
        ipfs: ipfs1,
      })
      db2 = await Database.create({
        accessController: accessController as AccessControllerInstance,
        address: databaseId,
        dir: './.out/orbitdb2',
        identity: testIdentity2,
        ipfs: ipfs2,
      })
    })

    it('emits \'update\' once when one operation is added', async () => {
      const expected = 1
      let connected1 = false
      let connected2 = false
      let updateCount1 = 0
      let updateCount2 = 0

      const onConnected2 = () => {
        connected2 = true
      }

      const onUpdate1 = async () => {
        ++updateCount1
      }

      const onUpdate2 = async () => {
        ++updateCount2
      }

      db1.sync.events.addEventListener('join', () => {
        connected1 = true
      })
      db2.sync.events.addEventListener('join', onConnected2)
      db1.events.addEventListener('update', onUpdate1)
      db2.events.addEventListener('update', onUpdate2)

      await waitFor(
        async () => {
          return connected1
        },
        async () => {
          return true
        },
      )
      await waitFor(
        async () => {
          return connected2
        },
        async () => {
          return true
        },
      )

      await db1.addOperation({
        key: '1',
        op: 'PUT',
        value: 'record 1 on db 1',
      })

      await waitFor(
        async () => {
          return updateCount1 >= expected
        },
        async () => {
          return true
        },
      )
      await waitFor(
        async () => {
          return updateCount2 >= expected
        },
        async () => {
          return true
        },
      )

      strictEqual(updateCount1, expected)
      strictEqual(updateCount2, expected)
    })

    it('emits \'update\' 4 times when 4 documents are added', async () => {
      const expected = 4
      let connected1 = false
      let connected2 = false
      let updateCount1 = 0
      let updateCount2 = 0

      const onConnected1 = async () => {
        connected1 = true
      }

      const onConnected2 = async () => {
        connected2 = true
      }

      const onUpdate1 = async () => {
        ++updateCount1
      }

      const onUpdate2 = async () => {
        ++updateCount2
      }

      db1.sync.events.addEventListener('join', onConnected1)
      db2.sync.events.addEventListener('join', onConnected2)
      db1.events.addEventListener('update', onUpdate1)
      db2.events.addEventListener('update', onUpdate2)

      await waitFor(
        async () => {
          return connected1
        },
        async () => {
          return true
        },
      )
      await waitFor(
        async () => {
          return connected2
        },
        async () => {
          return true
        },
      )

      await db1.addOperation({ key: String(1), op: 'PUT', value: '11' })
      await db1.addOperation({ key: String(2), op: 'PUT', value: '22' })
      await db1.addOperation({ key: String(3), op: 'PUT', value: '33' })
      await db1.addOperation({ key: String(4), op: 'PUT', value: '44' })

      await waitFor(
        async () => {
          return updateCount1 >= expected
        },
        async () => {
          return true
        },
      )
      await waitFor(
        async () => {
          return updateCount2 >= expected
        },
        async () => {
          return true
        },
      )

      strictEqual(updateCount1, expected)
      strictEqual(updateCount2, expected)
    })
  })
})
