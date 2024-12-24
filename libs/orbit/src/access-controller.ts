import type { AccessControllerInstance, EntryInstance, IdentitiesInstance, OrbitDBInstance } from '@regioni/orbit'

export type ACLCap = 'PUT' | 'DEL' | '*'
export type ACL = Record<'caps', ACLCap[]>
export type ACLDatabase = {
  get: (key: string) => Promise<ACL | null>
  put: (key: string, value: ACL) => Promise<string>
}

const CUSTOM_ACCESS_CONTROLLER_TYPE = 'custom' as const

export interface CustomAccessControllerInstance extends AccessControllerInstance {
  type: typeof CUSTOM_ACCESS_CONTROLLER_TYPE
  write: string[]
  grant: (id: string, key: string, caps: ACLCap[]) => Promise<void>
  revoke: (id: string, key: string, caps: ACLCap[]) => Promise<void>
  canAppend: (entry: EntryInstance) => Promise<boolean>
}

export class CustomAccessController implements CustomAccessControllerInstance {
  public type: typeof CUSTOM_ACCESS_CONTROLLER_TYPE = CUSTOM_ACCESS_CONTROLLER_TYPE

  static get type(): typeof CUSTOM_ACCESS_CONTROLLER_TYPE {
    return CUSTOM_ACCESS_CONTROLLER_TYPE
  }

  private db: ACLDatabase
  private identities: IdentitiesInstance

  public address: string
  public write: string[] = []

  private constructor(
    orbitdb: OrbitDBInstance,
    identities: IdentitiesInstance,
    address: string,
    db: ACLDatabase,
  ) {
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

  async grant(id: string, key: string, caps: ACLCap[]): Promise<void> {
    const aclKey = formatKey(id, key)

    const acl = await this.db.get(aclKey)
    const updatedCaps = caps.includes('*')
      ? ['*' as ACLCap]
      : (acl
          ? [...new Set([...acl.caps, ...caps])]
          : caps)

    await this.db.put(aclKey, {
      caps: updatedCaps,
    })
  }

  async revoke(id: string, key: string, caps: ACLCap[]): Promise<void> {
    const aclKey = formatKey(id, key)
    const aclData = await this.db.get(aclKey)
    if (!aclData) {
      return
    }

    const currentCaps = aclData.caps
    const updatedCaps = caps.includes('*')
      ? []
      : (currentCaps.includes('*')
          ? ['PUT', 'DEL'].filter((op) => {
              return !caps.includes(op as ACLCap)
            })
          : currentCaps.filter((op) => {
              return !caps.includes(op as ACLCap)
            }))

    await this.db.put(aclKey, {
      caps: updatedCaps as ACLCap[],
    })
  }

  private async hasCapability(id: string, key: string, cap: ACLCap): Promise<boolean> {
    const aclKey = formatKey(id, key)
    const aclData = await this.db.get(aclKey)
    if (!aclData) {
      return false
    }

    const currentCaps = aclData.caps
    if (!currentCaps) {
      return false
    }

    if (currentCaps.includes('*')) {
      return true
    }

    return currentCaps.includes(cap)
  }

  async canAppend(entry: EntryInstance): Promise<boolean> {
    const {
      identity,
      payload,
    } = entry

    if (!identity) {
      return false
    }

    const writerIdentity = await this.identities.getIdentity(identity)
    if (!writerIdentity) {
      return false
    }

    const { key, op: cap } = payload as { key: string, op: ACLCap }
    const hasCapability = await this.hasCapability(writerIdentity.id, key, cap)
    if (hasCapability) {
      return writerIdentity.verifyIdentity()
    }

    return false
  }
}

function formatKey(id: string, key: string): string {
  return `${id}:${key}`
}
