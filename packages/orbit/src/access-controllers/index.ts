import type { IdentitiesInstance } from '../identities'
import type { EntryInstance } from '../oplog'
import type { OrbitDBInstance } from '../orbitdb'
import type { StorageInstance } from '../storage'
import type { IPFSAccessControllerInstance } from './ipfs'
import type { OrbitDBAccessControllerInstance } from './orbitdb'

import { IPFSAccessController } from './ipfs'
import { OrbitDBAccessController } from './orbitdb'

export interface CreateAccessControllerOptions {
  storage?: StorageInstance<Uint8Array>
  write?: string[]
}

export interface AccessControllerOptions {
  address?: string
  identities: IdentitiesInstance
  name?: string
  orbitdb: OrbitDBInstance
}

export interface AccessControllerInstance {
  address?: string
  canAppend: (entry: EntryInstance) => Promise<boolean>
  close?: () => Promise<void>

  drop?: () => Promise<void>
  type: string
  write: string[]
}

export type AccessControllerTypeMap = {
  ipfs: IPFSAccessControllerInstance
  orbitdb: OrbitDBAccessControllerInstance
}

export interface AccessControllerType<D extends keyof AccessControllerTypeMap> {
  create: (...args: any[]) => Promise<AccessControllerTypeMap[D]>
  type: D
}

const accessControllers: Record<
  string,
  (
    ...args: any[]
  ) => Promise<AccessControllerTypeMap[keyof AccessControllerTypeMap]>
> = {}

export function getAccessController<D extends keyof AccessControllerTypeMap>(type: D) {
  if (!accessControllers[type!]) {
    throw new Error(`AccessController type '${type}' is not supported`)
  }

  return accessControllers[type!]
}

export function useAccessController<
  D extends keyof AccessControllerTypeMap = 'orbitdb',
>(accessController: AccessControllerType<D>) {
  if (!accessController.type) {
    throw new Error('AccessController does not contain required field \'type\'.')
  }

  accessControllers[accessController.type] = accessController.create
}

useAccessController(IPFSAccessController)
useAccessController(OrbitDBAccessController)

export * from './ipfs'
export * from './orbitdb'
