import type { AccessControllerInstance, EntryInstance, IdentitiesInstance, KeyValueDatabase, OrbitDBInstance } from '@regioni/orbit'

export type ACLCap = 'PUT' | 'DEL' | '*'
export type ACLRecord = Record<'caps', ACLCap[]>
export type ACLDatabase = KeyValueDatabase<ACLRecord>

const CUSTOM_ACCESS_CONTROLLER_TYPE = 'custom' as const

const ACL_PUT_CAP = 'PUT' as const
const ACL_DEL_CAP = 'DEL' as const
const ACL_ALL_CAP = '*' as const

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

  private constructor(options: {
    identities: IdentitiesInstance
    address: string
    db: ACLDatabase
  }) {
    this.identities = options.identities
    this.address = options.address
    this.db = options.db
  }

  static async create(options: {
    address: string
    orbitdb: OrbitDBInstance
    identities: IdentitiesInstance
  }): Promise<CustomAccessControllerInstance> {
    const {
      address,
      orbitdb,
      identities,
    } = options
    const db: ACLDatabase = await orbitdb.open<ACLRecord, 'keyvalue'>(
      'keyvalue',
      `${address}-acl`,
    )

    return new CustomAccessController({
      address,
      identities,
      db,
    })
  }

  async grant(id: string, key: string, caps: ACLCap[]): Promise<void> {
    const aclKey = formatKey(id, key)
    const aclData = await this.db.get(aclKey)
    const updatedCaps = caps.includes(ACL_ALL_CAP)
      ? [ACL_ALL_CAP]
      : (aclData
          ? [...new Set([...aclData.caps, ...caps])]
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

    const {
      caps: currentCaps,
    } = aclData
    const updatedCaps = caps.includes(ACL_ALL_CAP)
      ? [ACL_ALL_CAP]
      : (currentCaps.includes(ACL_ALL_CAP)
          ? [ACL_PUT_CAP, ACL_DEL_CAP].filter((op) => {
              return !caps.includes(op as ACLCap)
            })
          : currentCaps.filter((op) => {
              return !caps.includes(op as ACLCap)
            }))

    await this.db.put(aclKey, {
      caps: updatedCaps,
    })
  }

  private async hasCapability(id: string, key: string, cap: ACLCap): Promise<boolean> {
    const aclKey = formatKey(id, key)
    const aclData = await this.db.get(aclKey)
    if (!aclData) {
      return false
    }

    const {
      caps: currentCaps,
    } = aclData
    if (!currentCaps) {
      return false
    }

    if (currentCaps.includes(ACL_ALL_CAP)) {
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
    const hasCapability = await this.hasCapability(
      writerIdentity.id,
      key,
      cap,
    )
    if (hasCapability) {
      return this.identities.verifyIdentity(writerIdentity)
    }

    return false
  }
}

function formatKey(...args: string[]): string {
  return args
    .map((arg) => {
      return arg
        .trim()
        .replaceAll(
          '/',
          '-',
        )
    })
    .join(':')
}
