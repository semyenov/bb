import { createLogger } from '@regioni/lib-logger'

import type {
  AccessController,
  AccessControllerInstance,
  AccessControllerOptions,
  Entry,
} from '@orbitdb/core'

enum CAP {
  PUT = 'PUT',
  DEL = 'DEL',
  ALL = '*',
}

// Define a type for the ACL structure
type ACL = Record<'caps', CAP[]>

// Define a type for the database
type ACLDatabase = {
  get: (key: string) => Promise<ACL | null>
  put: (key: string, value: ACL) => Promise<string>
}

const CUSTOM_ACCESS_CONTROLLER_TYPE = 'custom' as const

const logger = createLogger({
  defaultMeta: {
    service: 'orbitdb',
    label: 'access-controller',
  },
})

export const CustomAccessController = (): ((
  options: AccessControllerOptions,
) => AccessController<'custom', AccessControllerInstance>) => {
  return ({ orbitdb, address, identities }) => {
    const accessController = async () => {
      const db: ACLDatabase = await orbitdb.open<ACL, 'keyvalue'>(
        `${address}-acl`,
        { type: 'keyvalue' },
      )

      async function canAppend({
        identity,
        payload,
      }: Entry.Instance<unknown>): Promise<boolean> {
        logger.info(`Checking if user ${identity} can append to ${payload.key}`)

        const writerIdentity = await identities.getIdentity(identity)
        if (!writerIdentity) {
          return false
        }

        const { id } = writerIdentity
        const { key, op: cap } = payload

        const hasWriteAccess = await hasCapability(id, key, cap as CAP)
        if (hasWriteAccess) {
          return identities.verifyIdentity(writerIdentity)
        }

        return false
      }

      async function grant(
        id: string,
        key: string,
        caps: CAP[],
      ): Promise<void> {
        logger.info(
          `Granting ${key} caps ${caps} to user ${id} for ${address} db`,
        )

        const acl = await db.get(id + key)
        const updatedCaps = caps.includes(CAP.ALL)
          ? [CAP.ALL]
          : acl
            ? [...new Set([...acl.caps, ...caps])]
            : caps

        await db.put(id + key, {
          caps: updatedCaps,
        })
      }

      async function revoke(
        id: string,
        key: string,
        caps: CAP[],
      ): Promise<void> {
        logger.info(
          `Revoking ${key} caps ${caps} from user ${id} for ${address} db`,
        )

        const acl = await db.get(id + key)
        if (!acl) {
          return
        }

        const currentCaps = acl.caps
        const updatedCaps = caps.includes(CAP.ALL)
          ? []
          : currentCaps.includes(CAP.ALL)
            ? [CAP.PUT, CAP.DEL].filter((op) => !caps.includes(op))
            : currentCaps.filter((op) => !caps.includes(op))

        await db.put(id + key, {
          caps: updatedCaps,
        })
      }

      const hasCapability = async (id: string, key: string, cap: CAP) => {
        logger.info(
          `Checking ${key} cap ${cap} for identity ${id} for ${address} db`,
        )

        const acl = await db.get(id + key)
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

      return {
        canAppend,

        grant,
        revoke,
      }
    }

    accessController.type = CUSTOM_ACCESS_CONTROLLER_TYPE

    return accessController
  }
}
