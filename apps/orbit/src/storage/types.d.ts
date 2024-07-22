/* eslint-disable no-unused-vars */
export interface StorageInstance<T> {
  put: (hash: string, data: any) => Promise<void>
  get: (hash: string) => Promise<T | null>
  del: (hash: string) => Promise<void>

  merge: (other: StorageInstance<T>) => Promise<void>

  close: () => Promise<void>
  clear: () => Promise<void>

  iterator: (options?: {
    amount: number
    reverse: boolean
  }) => AsyncGenerator<[string, T], void>
}
