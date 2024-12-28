import { LRUCache } from 'lru-cache'

import type { StorageInstance } from './types.d'

import { STORAGE_LRU_SIZE } from '../constants'

export interface LRUStorageOptions {
  size?: number
}

export class LRUStorage<T = unknown> implements StorageInstance<T> {
  private lru: LRUCache<string, { data: T }>
  private readonly size: number

  private constructor({ size = STORAGE_LRU_SIZE }: LRUStorageOptions = {}) {
    this.size = size
    this.lru = new LRUCache<string, { data: T }>({ max: this.size })
  }

  static create<T = unknown>(options: LRUStorageOptions = {}): LRUStorage<T> {
    return new LRUStorage<T>(options)
  }

  async clear(): Promise<void> {
    this.lru.clear()
  }

  async close(): Promise<void> {
    // No-op for LRU storage
  }

  async del(hash: string): Promise<void> {
    this.lru.delete(hash)
  }

  async get(hash: string): Promise<null | T> {
    return this.lru.get(hash)?.data || null
  }

  async *iterator(): AsyncIterableIterator<[string, T]> {
    for (const key of Array.from(this.lru.keys())) {
      const value = this.lru.get(key)
      yield [key, value?.data] as [string, T]
    }
  }

  async merge(other: StorageInstance<T>): Promise<void> {
    if (other) {
      for await (const [key, value] of other.iterator()) {
        this.lru.set(key, { data: value })
      }
    }
  }

  async put(hash: string, data: T): Promise<void> {
    this.lru.set(hash, { data })
  }
}
