export type StorageIteratorOptions = {
  amount: number
  reverse: boolean
}

export interface StorageInstance<T> {
  clear: () => Promise<void>
  close: () => Promise<void>
  del: (hash: string) => Promise<void>

  get: (hash: string) => Promise<null | T>

  iterator: (options?: StorageIteratorOptions) => AsyncIterable<[string, T]>
  merge: (other: StorageInstance<T>) => Promise<void>

  put: (hash: string, data: T) => Promise<void>
}
