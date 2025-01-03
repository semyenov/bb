import { copy } from 'fs-extra'
import { deepStrictEqual } from 'node:assert'
import { rimraf } from 'rimraf'
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest'

import type { KeyValueIndexedDatabase } from '../../../src/databases/keyvalue-indexed'
import type { IdentityInstance } from '../../../src/identities/identity'
import type { OrbitDBHeliaInstance } from '../../../src/vendor'

import {
  Identities,
  KeyStore,
  KeyValueIndexed,
} from '../../../src'
import testKeysPath from '../../fixtures/test-keys-path'
import connectPeers from '../../utils/connect-nodes'
import createHelia from '../../utils/create-helia'
import waitFor from '../../utils/wait-for'

const keysPath = './testkeys'
describe('keyValueIndexed Database Replication', () => {
  let ipfs1: OrbitDBHeliaInstance, ipfs2: OrbitDBHeliaInstance
  let keystore: KeyStore
  let identities: Identities
  let identities2: Identities
  let testIdentity1: IdentityInstance, testIdentity2: IdentityInstance
  let kv1: KeyValueIndexedDatabase, kv2: KeyValueIndexedDatabase

  const databaseId = 'kv-AAA'

  const accessController = {
    canAppend: async (entry) => {
      const identity = await identities.getIdentity(entry.identity)

      return identity.id === testIdentity1.id
        || identity.id === testIdentity2.id
    },
  }

  beforeAll(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    await rimraf(keysPath)
    await rimraf('./orbitdb1')
    await rimraf('./orbitdb2')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore.create({ path: keysPath })
    identities = await Identities.create({ ipfs: ipfs1, keystore })
    identities2 = await Identities.create({ ipfs: ipfs2, keystore })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
    testIdentity2 = await identities2.createIdentity({ id: 'userB' })
  })
  afterEach(async () => {
    if (kv1) {
      await kv1.drop()
      await kv1.close()
    }
    if (kv2) {
      await kv2.drop()
      await kv2.close()
    }
  })

  afterAll(async () => {
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

  it('replicates a database', async () => {
    let replicated = false
    let expectedEntryHash: null | string = null

    const onError = (err: Error) => {
      console.error(err)
    }

    kv1 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './.out/orbitdb1',
      identity: testIdentity1,
      ipfs: ipfs1,
    })
    kv2 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './.out/orbitdb2',
      identity: testIdentity2,
      ipfs: ipfs2,
    })

    kv2.sync.events.addEventListener('join', (event: CustomEvent) => {
      const { heads } = event.detail
      replicated = expectedEntryHash !== null
      && heads.map((e) => {
        return e.hash
      })
        .includes(expectedEntryHash)
    })
    kv2.events.addEventListener('update', (event: CustomEvent) => {
      const { entry } = event.detail
      replicated = expectedEntryHash !== null
      && entry.hash === expectedEntryHash
    })

    kv2.events.addEventListener('error', onError)
    kv1.events.addEventListener('error', onError)

    await kv1.put('init', true)
    await kv1.put('hello', 'friend')
    await kv1.del('hello')
    await kv1.put('hello', 'friend2')
    await kv1.del('hello')
    await kv1.put('empty', '')
    await kv1.del('empty')
    expectedEntryHash = await kv1.put('hello', 'friend3')

    await waitFor(() => {
      return replicated
    }, () => {
      return true
    })

    const value0 = await kv2.get('init')
    deepStrictEqual(value0, true)

    const value2 = await kv2.get('hello')
    deepStrictEqual(value2, 'friend3')

    const value1 = await kv1.get('hello')
    deepStrictEqual(value1, 'friend3')

    const value9 = await kv1.get('empty')
    deepStrictEqual(value9, null)

    const all2: KeyValueDoc[] = []
    for await (const keyValue of kv2.iterator()) {
      all2.push(keyValue)
    }
    deepStrictEqual(
      all2.map((e) => {
        return { key: e.key, value: e.value }
      }),
      [
        { key: 'init', value: true },
        { key: 'hello', value: 'friend3' },
      ],
    )

    const all1: KeyValueDoc[] = []
    for await (const keyValue of kv1.iterator()) {
      all1.push(keyValue)
    }
    deepStrictEqual(
      all1.map((e) => {
        return { key: e.key, value: e.value }
      }),
      [
        { key: 'init', value: true },
        { key: 'hello', value: 'friend3' },
      ],
    )
  })

  it('loads the database after replication', async () => {
    let replicated = false
    let expectedEntryHash: null | string = null

    kv1 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb1',
      identity: testIdentity1,
      ipfs: ipfs1,
    })
    kv2 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb2',
      identity: testIdentity2,
      ipfs: ipfs2,
    })

    kv2.sync.events.addEventListener('join', (event: CustomEvent) => {
      const { heads } = event.detail
      replicated = expectedEntryHash !== null
      && heads.map((e) => {
        return e.hash
      })
        .includes(expectedEntryHash)
    })
    kv2.events.addEventListener('update', (event: CustomEvent) => {
      const { entry } = event.detail
      replicated = expectedEntryHash !== null
      && entry.hash === expectedEntryHash
    })

    kv2.events.addEventListener('error', (err) => {
      console.error(err)
    })
    kv1.events.addEventListener('error', (err) => {
      console.error(err)
    })

    await kv1.put('init', true)
    await kv1.put('hello', 'friend')
    await kv1.del('hello')
    await kv1.put('hello', 'friend2')
    await kv1.del('hello')
    await kv1.put('empty', '')
    await kv1.del('empty')
    expectedEntryHash = await kv1.put('hello', 'friend3')

    await waitFor(() => {
      return replicated
    }, () => {
      return true
    })

    await kv1.close()
    await kv2.close()

    kv1 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb1',
      identity: testIdentity1,
      ipfs: ipfs1,
    })
    kv2 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb2',
      identity: testIdentity2,
      ipfs: ipfs2,
    })

    const value0 = await kv2.get('init')
    deepStrictEqual(value0, true)

    const value2 = await kv2.get('hello')
    deepStrictEqual(value2, 'friend3')

    const value1 = await kv1.get('hello')
    deepStrictEqual(value1, 'friend3')

    const value9 = await kv1.get('empty')
    deepStrictEqual(value9, null)

    const all2: KeyValueDoc[] = []
    for await (const keyValue of kv2.iterator()) {
      all2.push(keyValue)
    }
    deepStrictEqual(
      all2.map((e) => {
        return { key: e.key, value: e.value }
      }),
      [
        { key: 'init', value: true },
        { key: 'hello', value: 'friend3' },
      ],
    )

    const all1: KeyValueDoc[] = []
    for await (const keyValue of kv1.iterator()) {
      all1.push(keyValue)
    }
    deepStrictEqual(
      all1.map((e) => {
        return { key: e.key, value: e.value }
      }),
      [
        { key: 'init', value: true },
        { key: 'hello', value: 'friend3' },
      ],
    )
  })

  it('indexes the database correctly', async () => {
    let replicated1: boolean | string = false
    let replicated2: boolean | string = false
    let replicated3: boolean | string = false
    let expectedEntryHash1: null | string = null
    let expectedEntryHash2: null | string = null
    let expectedEntryHash3: null | string = null

    const onError = (err: any) => {
      console.error(err)
      deepStrictEqual(err, null)
    }

    kv1 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb1',
      identity: testIdentity1,
      ipfs: ipfs1,
    })
    kv2 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb2',
      identity: testIdentity2,
      ipfs: ipfs2,
    })

    kv2.events.addEventListener('update', (event: CustomEvent) => {
      const { entry } = event.detail
      replicated1 = expectedEntryHash1 !== null && entry.hash === expectedEntryHash1
    })

    kv2.events.addEventListener('error', onError)
    kv1.events.addEventListener('error', onError)

    await kv1.put('init', true)
    await kv1.put('hello', 'friend')
    await kv1.del('hello')
    await kv1.put('hello', 'friend2')
    await kv1.del('hello')
    await kv1.put('empty', '')
    await kv1.del('empty')
    expectedEntryHash1 = await kv1.put('hello', 'friend3')

    await waitFor(() => {
      return replicated1
    }, () => {
      return true
    })

    await kv1.close()

    await kv2.put('A', 'AAA')
    await kv2.put('B', 'BBB')
    expectedEntryHash3 = await kv2.put('C', 'CCC')

    await kv2.close()

    kv1 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb1',
      identity: testIdentity1,
      ipfs: ipfs1,
    })

    const onUpdate3 = async (event: CustomEvent) => {
      const { entry } = event.detail
      replicated3 = expectedEntryHash3 && entry.hash === expectedEntryHash3
    }

    kv1.events.addEventListener('update', onUpdate3)
    kv1.events.addEventListener('error', onError)

    await kv1.put('one', 1)
    await kv1.put('two', 2)
    await kv1.put('three', 3)
    await kv1.del('three')
    expectedEntryHash2 = await kv1.put('four', 4)

    kv2 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb2',
      identity: testIdentity2,
      ipfs: ipfs2,
    })

    kv2.events.addEventListener('update', (event: CustomEvent) => {
      const { entry } = event.detail
      replicated2 = expectedEntryHash2 && entry.hash === expectedEntryHash2
    })
    kv2.events.addEventListener('error', onError)

    await waitFor(() => {
      return replicated2 && replicated3
    }, () => {
      return true
    })

    const all1: KeyValueDoc[] = []
    for await (const keyValue of kv1.iterator()) {
      all1.push(keyValue)
    }

    const all2: KeyValueDoc[] = []
    for await (const keyValue of kv2.iterator()) {
      all2.push(keyValue)
    }

    deepStrictEqual(
      all2.map((e) => {
        return { key: e.key, value: e.value }
      }),
      [
        { key: 'two', value: 2 },
        { key: 'one', value: 1 },
        { key: 'init', value: true },
        { key: 'hello', value: 'friend3' },
        { key: 'four', value: 4 },
        { key: 'C', value: 'CCC' },
        { key: 'B', value: 'BBB' },
        { key: 'A', value: 'AAA' },
      ],
    )

    deepStrictEqual(
      all1.map((e) => {
        return { key: e.key, value: e.value }
      }),
      [
        { key: 'two', value: 2 },
        { key: 'one', value: 1 },
        { key: 'init', value: true },
        { key: 'hello', value: 'friend3' },
        { key: 'four', value: 4 },
        { key: 'C', value: 'CCC' },
        { key: 'B', value: 'BBB' },
        { key: 'A', value: 'AAA' },
      ],
    )
  })

  it('indexes deletes correctly', async () => {
    let replicated = false

    kv1 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './.out/orbitdb11',
      identity: testIdentity1,
      ipfs: ipfs1,
    })

    kv1.events.addEventListener('error', (err) => {
      console.error(err)
      deepStrictEqual(err)
    })

    await kv1.put('init', true)
    await kv1.put('hello', 'friend')
    await kv1.del('delete')
    await kv1.put('delete', 'this value')
    await kv1.del('delete')

    kv2 = await KeyValueIndexed.create({
      accessController,
      address: databaseId,
      directory: './orbitdb22',
      identity: testIdentity2,
      ipfs: ipfs2,
    })

    kv2.events.addEventListener('update', (_entry) => {
      replicated = true
    })
    kv2.events.addEventListener('error', (err) => {
      console.error(err)
      deepStrictEqual(err)
    })

    await waitFor(() => {
      return replicated
    }, () => {
      return true
    })

    const all1: KeyValueDoc[] = []
    for await (const keyValue of kv1.iterator()) {
      all1.push(keyValue)
    }

    const all2: KeyValueDoc[] = []
    for await (const keyValue of kv2.iterator()) {
      all2.push(keyValue)
    }

    deepStrictEqual(
      all2.map((e) => {
        return { key: e.key, value: e.value }
      }),
      [
        { key: 'init', value: true },
        { key: 'hello', value: 'friend' },
      ],
    )

    deepStrictEqual(
      all1.map((e) => {
        return { key: e.key, value: e.value }
      }),
      [
        { key: 'init', value: true },
        { key: 'hello', value: 'friend' },
      ],
    )

    await rimraf('./.out')
  })
})
