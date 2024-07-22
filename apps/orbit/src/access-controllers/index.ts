import type { DatabaseEvents } from './events'
import type { IdentitiesInstance, OrbitDBInstance } from '@orbitdb/core'
import type { Entry } from '@orbitdb/core'
import type { StorageInstance } from './storage'

import IPFSAccessController from './ipfs.js'
import OrbitDBAccessController from './orbitdb.js'

interface CreateAccessControllerOptions {
  write?: string[]
  storage?: StorageInstance
}

interface AccessControllerOptions {
  orbitdb: OrbitDBInstance
  identities: IdentitiesInstance
  address?: string
}

interface AccessControllerInstance {
  canAppend: (entry: Entry.Instance) => Promise<boolean>
}

type AccessController<T extends string, U extends AccessControllerInstance> = {
  type: T
  (options: AccessControllerOptions): Promise<U>
}

interface IPFSAccessControllerInstance extends AccessControllerInstance {
  type: string
  address: string
  write: string[]
}

declare type IPFSAccessController = (
  options?: CreateAccessControllerOptions,
) => AccessController<'ipfs', IPFSAccessControllerInstance>

interface OrbitDBAccessControllerInstance extends AccessControllerInstance {
  events: DatabaseEvents

  close: () => Promise<void>
  drop: () => Promise<void>
  capabilities: () => Promise<string[]>
  get: (capability: string) => Promise<string[]>
  grant: (capability: string, key: string) => Promise<void>
  hasCapability: (capability: string, key: string) => Promise<boolean>
  revoke: (capability: string, key: string) => Promise<void>
}

declare type OrbitDBAccessController = (
  options?: CreateAccessControllerOptions,
) => AccessController<'orbitdb', OrbitDBAccessControllerInstance>

export type {
  AccessController,
  AccessControllerOptions,
  AccessControllerInstance,
  IPFSAccessControllerInstance,
  OrbitDBAccessControllerInstance,
}
export { IPFSAccessController, OrbitDBAccessController }

const accessControllers: Record<string, AccessController<any, any>> = {}

export function useAccessController(
  accessController: AccessController<string, AccessControllerInstance>,
): void {
  if (!accessController.type) {
  throw new Error("AccessController does not contain required field 'type'.")
}

accessControllers[accessController.type] = accessController
}

/**
 * Gets an access controller module specified by type.
 * @param {string} type A valid access controller type.
 * @return {AccessController} The access controller module.
 * @private
 */
const getAccessController = (type) => {
const getAccessController = (type: string): AccessController<any, any> => {
  if (!accessControllers[type]) {
    throw new Error(`AccessController type '${type}' is not supported`)
  }
  return accessControllers[type]
}

/**
 * Adds an access controller module to the list of supported access controller.
 * @param {AccessController} accessController A compatible access controller
 * module.
 * @throws AccessController does not contain required field \'type\'.
 * @throws AccessController '${accessController.type}' already added.
 * @static
 */
const useAccessController = (accessController) => {
const useAccessController = (accessController: AccessController<string, AccessControllerInstance>): void => {
  if (!accessController.type) {
    throw new Error("AccessController does not contain required field 'type'.")
  }

  accessControllers[accessController.type] = accessController
}

useAccessController(IPFSAccessController)
useAccessController(OrbitDBAccessController)

export {
  getAccessController,
  useAccessController,
  IPFSAccessController,
  OrbitDBAccessController,
}
