export type StorageIteratorOptions = {
  amount: number
  reverse: boolean
}

export interface StorageInstance<T> {
  put: (hash: string, data: T) => Promise<void>
  get: (hash: string) => Promise<T | null>
  del: (hash: string) => Promise<void>

  merge: (other: StorageInstance<T>) => Promise<void>

  close: () => Promise<void>
  clear: () => Promise<void>

  iterator: (options?: StorageIteratorOptions) => AsyncIterable<[string, T]>
}
