import { Level, type IteratorOptions as LevelIteratorOptions } from 'level'

import type { StorageInstance } from '../storage'

export interface LevelStorageOptions {
  path?: string
  valueEncoding?: string
}
export interface LevelStorageInstance<T> extends StorageInstance<T> {}

const DEFAULT_PATH = './level'
const DEFAULT_VALUE_ENCODING = 'view'

export const LevelStorage = async <T = unknown>({
  path = DEFAULT_PATH,
  valueEncoding = DEFAULT_VALUE_ENCODING,
}: LevelStorageOptions): Promise<LevelStorageInstance<T>> => {
  const level = new Level<string, T>(path, {
    valueEncoding,
    createIfMissing: true,
  })
  await level.open()

  const storage: LevelStorageInstance<T> = {
    put: async (hash: string, value: T) => {
      await level.put(hash, value)
    },
    del: async (hash: string) => {
      await level.del(hash)
    },
    get: async (hash: string) => {
      return level.get(hash)
    },
    async *iterator(options: LevelIteratorOptions<string, T> = {}) {
      for await (const [key, value] of level.iterator(options)) {
        yield [key, value] as [string, T]
      }
    },
    merge: async () => {},
    clear: async () => {
      await level.clear()
    },
    close: async () => {
      await level.close()
    },
  }

  return storage
}
