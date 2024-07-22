/* eslint-disable no-unused-vars */
import type { AccessControllerInstance } from '../access-controllers'
import type { IdentitiesInstance, IdentityInstance } from '../identities'
import type { StorageInstance } from '../storage'
import type { HeliaInstance } from '../vendor'

interface Clock {
  id: string
  time: number
}

export namespace Entry {
  export interface Instance<T = unknown> {
    id: string
    payload: {
      op: 'PUT' | 'DEL'
      key: string
      value: T
    }
    hash: string
    next: string[]
    refs: string[]
    clock: Clock
    v: number
    key: string
    identity: string
    sig: string
  }

  export function create<T>(
    identity: IdentityInstance,
    id: string,
    payload: T,
    clock?: Clock,
    next?: Array<string | Instance<T>>,
    refs?: Array<string | Instance<T>>,
  ): Promise<Instance<T>>
  export function verify<T>(
    identities: IdentitiesInstance,
    entry: Instance<T>,
  ): Promise<boolean>
  export function isEntry(obj: unknown): boolean
  export function isEqual<T>(a: Instance<T>, b: Instance<T>): boolean
  export function decode<T>(bytes: Uint8Array): Promise<Instance<T>>
  export function encode<T>(entry: Instance<T>): Promise<Uint8Array>
}

interface LogIteratorOptions {
  gt?: string
  gte?: string
  lt?: string
  lte?: string
  amount?: number
}
interface LogAppendOptions {
  referencesCount: number
}
interface LogOptions<T> {
  logId?: string
  logHeads?: Entry.Instance<T>[]
  access?: AccessControllerInstance
  entries?: Entry.Instance<T>[]
  entryStorage?: StorageInstance
  headsStorage?: StorageInstance
  indexStorage?: StorageInstance
  sortFn?: (a: Entry.Instance<T>, b: Entry.Instance<T>) => number
}
interface LogInstance<T> {
  id: string

  access?: AccessControllerInstance
  identity: IdentityInstance
  storage: StorageInstance

  clock: () => Promise<Clock>
  heads: () => Promise<Entry.Instance<T>[]>
  values: () => Promise<Entry.Instance<T>[]>
  all: () => Promise<Entry.Instance<T>[]>
  get: (hash: string) => Promise<Entry.Instance<T> | undefined>
  has: (hash: string) => Promise<boolean>
  append: (payload: T, options?: LogAppendOptions) => Promise<Entry.Instance<T>>
  join: (log: LogInstance<T>) => Promise<void>
  joinEntry: (entry: Entry.Instance<T>) => Promise<void>
  traverse: () => AsyncGenerator<Entry.Instance<T>>
  iterator: (options?: LogIteratorOptions) => AsyncIterable<Entry.Instance<T>>
  clear: () => Promise<void>
  close: () => Promise<void>
}
declare function Log<T>(
  ipfs: HeliaInstance,
  identity: IdentityInstance,
  options?: LogOptions<T>,
): Promise<LogInstance<T>>

export type {
  Clock,
  LogAppendOptions,
  LogInstance,
  LogIteratorOptions,
  LogOptions,
}
export { Log }
