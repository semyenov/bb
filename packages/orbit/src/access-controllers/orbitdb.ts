import type { TypedEventEmitter } from '@libp2p/interface'

import type { AccessControllerInstance } from '.'
import type { DatabaseEvents } from '../database'
import type { DatabaseTypeMap } from '../databases'
import type { IdentitiesInstance } from '../identities'
import type { EntryInstance } from '../oplog/entry'
import type { OrbitDBInstance } from '../orbitdb'

import { ACCESS_CONTROLLER_ORBITDB_TYPE } from '../constants'
import { createId } from '../utils'
import { IPFSAccessController } from './ipfs'

export interface OrbitDBAccessControllerInstance<
  E extends DatabaseEvents<string[]> = DatabaseEvents<string[]>,
> extends AccessControllerInstance {
  address: string
  capabilities: () => Promise<Record<string, Set<string>>>
  close: () => Promise<void>
  drop: () => Promise<void>

  events: TypedEventEmitter<E>
  get: (capability: string) => Promise<Set<string>>
  grant: (capability: string, key: string) => Promise<void>
  hasCapability: (capability: string, key: string) => Promise<boolean>
  revoke: (capability: string, key: string) => Promise<void>
  type: string
  write: string[]
}

interface OrbitDBAccessControllerOptions {
  address?: string
  identities: IdentitiesInstance
  name?: string
  orbitdb: OrbitDBInstance
  write?: string[]
}

export class OrbitDBAccessController
implements OrbitDBAccessControllerInstance<DatabaseEvents<string[]>> {
  static get type(): 'orbitdb' {
    return ACCESS_CONTROLLER_ORBITDB_TYPE
  }

  public address: string

  public events: TypedEventEmitter<DatabaseEvents<string[]>>
  public write: string[]
  get type(): 'orbitdb' {
    return ACCESS_CONTROLLER_ORBITDB_TYPE
  }

  private database: DatabaseTypeMap<string[]>['keyvalue']
  private identities: IdentitiesInstance

  private constructor(
    orbitdb: OrbitDBInstance,
    identities: IdentitiesInstance,
    database: DatabaseTypeMap<string[]>['keyvalue'],
    address: string,
    write?: string[],
  ) {
    this.identities = identities
    this.database = database
    this.write = write || [orbitdb.identity.id]
    this.address = address
    this.events = database.events
  }

  static async create(
    options: OrbitDBAccessControllerOptions,
  ): Promise<OrbitDBAccessControllerInstance<DatabaseEvents<string[]>>> {
    const { identities, name, orbitdb, write } = options
    const address = options.address || name || (await createId(64))

    const database = await orbitdb.open<string[], 'keyvalue'>(
      'keyvalue',
      address,
      {
        AccessController: IPFSAccessController.create,
        type: 'keyvalue',
      },
    )

    return new OrbitDBAccessController(
      orbitdb,
      identities,
      database,
      address,
      write,
    )
  }

  async canAppend(entry: EntryInstance): Promise<boolean> {
    const writerIdentity = await this.identities.getIdentity(entry.identity!)
    if (!writerIdentity) {
      return false
    }

    const { id } = writerIdentity
    const hasWriteAccess
      = (await this.hasCapability('write', id))
      || (await this.hasCapability('admin', id))
    if (hasWriteAccess) {
      return this.identities.verifyIdentity(writerIdentity)
    }

    return false
  }

  async capabilities(): Promise<Record<string, Set<string>>> {
    const caps: Record<string, Set<string>> = {}
    for await (const { key, value } of this.database.iterator()) {
      if (!key) {
        continue
      }

      caps[key] = new Set(value)
    }

    const toSet = (e: [string, Set<string>]) => {
      const [key, value] = e
      caps[key] = new Set([...(caps[key] || []), ...value])
    }

    for (const e of Object.entries({
      ...caps,
      ...{
        admin: new Set([
          ...(caps.admin || []),
          ...this.database.accessController.write,
        ]),
      },
    })) {
      toSet(e)
    }

    return caps
  }

  async close(): Promise<void> {
    await this.database.close()
  }

  async drop(): Promise<void> {
    await this.database.drop()
  }

  async get(capability: string): Promise<Set<string>> {
    const caps = await this.capabilities()

    return caps[capability!] || new Set([])
  }

  async grant(capability: string, key: string): Promise<void> {
    const caps = new Set([
      ...((await this.database.get(capability)) || []),
      key,
    ])
    await this.database.put(capability, Array.from(caps))
  }

  async hasCapability(capability: string, key: string): Promise<boolean> {
    const access = await this.get(capability)

    return access.has(key) || access.has('*')
  }

  async revoke(capability: string, key: string): Promise<void> {
    const caps = new Set((await this.database.get(capability)) || [])
    caps.delete(key)
    if (caps.size > 0) {
      await this.database.put(capability, Array.from(caps.values()))
    }
    else {
      await this.database.del(capability)
    }
  }
}
