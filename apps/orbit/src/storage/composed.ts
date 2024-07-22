import type { StorageInstance } from './types'

export interface ComposedStorageOptions<T> {
  storage1: StorageInstance<T>
  storage2: StorageInstance<T>
}
export interface ComposedStorageInstance<T> extends StorageInstance<T> {}

export const ComposedStorage = async <T>({
  storage1,
  storage2,
}: ComposedStorageOptions<T>) => {
  const storage: ComposedStorageInstance<T> = {
    put: async (hash: string, data: T) => {
      await storage1.put(hash, data)
      await storage2.put(hash, data)
    },
    get: async (hash: string) => {
      let value = await storage1.get(hash)
      if (!value) {
        value = await storage2.get(hash)
        if (value) {
          await storage1.put(hash, value)
        }
      }
      return value
    },
    del: async (hash: string) => {
      await storage1.del(hash)
      await storage2.del(hash)
    },
    async *iterator(options) {
      const keys: Map<string, boolean> = new Map()

      for (const storage of [storage1, storage2]) {
        for await (const [key, value] of storage.iterator(options)) {
          if (!keys.has(key)) {
            keys.set(key, true)
            yield [key, value] as [string, T]
          }
        }
      }
    },
    merge: async (other) => {
      await storage1.merge(other)
      await storage2.merge(other)
      await other.merge(storage1)
      await other.merge(storage2)
    },
    clear: async () => {
      await storage1.clear()
      await storage2.clear()
    },
    close: async () => {
      await storage1.close()
      await storage2.close()
    },
  }

  return storage
}
