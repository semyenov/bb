import type { AccessControllerInstance, EntryInstance, IdentitiesInstance, OrbitDBInstance } from '@regioni/orbit'

export enum CAP {
  PUT = 'PUT',
  DEL = 'DEL',
  ALL = '*',
}

type ACL = Record<'caps', CAP[]>
type ACLDatabase = {
  get: (key: string) => Promise<ACL | null>
  put: (key: string, value: ACL) => Promise<string>
}

const CUSTOM_ACCESS_CONTROLLER_TYPE = 'custom' as const

export interface CustomAccessControllerInstance extends AccessControllerInstance {
  type: typeof CUSTOM_ACCESS_CONTROLLER_TYPE
  write: string[]
  grant: (id: string, key: string, caps: CAP[]) => Promise<void>
  revoke: (id: string, key: string, caps: CAP[]) => Promise<void>
  canAppend: (entry: EntryInstance) => Promise<boolean>
}

export class CustomAccessController implements CustomAccessControllerInstance {
  public type: typeof CUSTOM_ACCESS_CONTROLLER_TYPE = CUSTOM_ACCESS_CONTROLLER_TYPE

  static get type(): typeof CUSTOM_ACCESS_CONTROLLER_TYPE {
    return CUSTOM_ACCESS_CONTROLLER_TYPE
  }

  private db: ACLDatabase
  private orbitdb: OrbitDBInstance
  private identities: IdentitiesInstance

  public address: string
  public write: string[] = []

  private constructor(
    orbitdb: OrbitDBInstance,
    identities: IdentitiesInstance,
    address: string,
    db: ACLDatabase,
  ) {
    this.orbitdb = orbitdb
    this.identities = identities
    this.address = address
    this.db = db
  }

  static async create(options: {
    orbitdb: OrbitDBInstance
    identities: IdentitiesInstance
    address: string
  }): Promise<CustomAccessControllerInstance> {
    const { orbitdb, identities, address } = options

    const db: ACLDatabase = await orbitdb.open<ACL, 'keyvalue'>(
      'keyvalue',
      `${address}-acl`,
    )

    return new CustomAccessController(
      orbitdb,
      identities,
      address,
      db,
    )
  }

  async grant(id: string, key: string, caps: CAP[]): Promise<void> {
    const acl = await this.db.get(id + key)
    const updatedCaps = caps.includes(CAP.ALL)
      ? [CAP.ALL]
      : (acl
          ? [...new Set([...acl.caps, ...caps])]
          : caps)

    await this.db.put(id + key, {
      caps: updatedCaps,
    })
  }

  async revoke(id: string, key: string, caps: CAP[]): Promise<void> {
    const acl = await this.db.get(id + key)
    if (!acl) {
      return
    }

    const currentCaps = acl.caps
    const updatedCaps = caps.includes(CAP.ALL)
      ? []
      : (currentCaps.includes(CAP.ALL)
          ? [CAP.PUT, CAP.DEL].filter((op) => {
              return !caps.includes(op)
            })
          : currentCaps.filter((op) => {
              return !caps.includes(op)
            }))

    await this.db.put(id + key, {
      caps: updatedCaps,
    })
  }

  private async hasCapability(id: string, key: string, cap: CAP): Promise<boolean> {
    const acl = await this.db.get(id + key)
    if (!acl) {
      return false
    }

    const currentCaps = acl.caps
    if (!currentCaps) {
      return false
    }

    if (currentCaps.includes(CAP.ALL)) {
      return true
    }

    return currentCaps.includes(cap)
  }

  async canAppend(entry: EntryInstance): Promise<boolean> {
    const { identity, payload } = entry
    const writerIdentity = await this.identities.getIdentity(identity!)
    if (!writerIdentity) {
      return false
    }

    const { key, op: cap } = payload as { key: string, op: CAP }
    const hasWriteAccess = await this.hasCapability(writerIdentity.id, key, cap)
    if (hasWriteAccess) {
      return this.identities.verifyIdentity(writerIdentity)
    }

    return false
  }
}
