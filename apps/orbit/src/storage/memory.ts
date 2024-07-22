import type { StorageInstance } from './types'

export interface MemoryStorageOptions {}
export interface MemoryStorageInstance<T> extends StorageInstance<T> {}

export const MemoryStorage = async <T = unknown>(): Promise<
  MemoryStorageInstance<T>
> => {
  const memory: Map<string, T> = new Map()

  const storage: MemoryStorageInstance<T> = {
    put: async (hash, data) => {
      memory.set(hash, data)
    },
    del: async (hash) => {
      memory.delete(hash)
    },
    get: async (hash) => {
      return memory.get(hash) || null
    },
    async *iterator() {
      for await (const [key, value] of memory.entries()) {
        yield [key, value] as [string, T]
      }
    },
    merge: async (other) => {
      if (other) {
        for await (const [key, value] of other.iterator()) {
          memory.set(key, value)
        }
      }
    },
    clear: async () => {
      memory.clear()
    },
    close: async () => {},
  }

  return storage
}
