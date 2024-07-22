import type {
  ComposedStorageInstance,
  ComposedStorageOptions,
} from './composed.js'
import type {
  IPFSBlockStorageInstance,
  IPFSBlockStorageOptions,
} from './ipfs-block.js'
import type { LevelStorageInstance, LevelStorageOptions } from './level.js'
import type { LRUStorageInstance, LRUStorageOptions } from './lru.js'
import type { MemoryStorageInstance, MemoryStorageOptions } from './memory.js'
import type { StorageInstance } from './types.js'

interface StorageTypeMap<T> {
  composed: StorageInstance<T>
  ipfs: IPFSBlockStorageInstance<T>
  lru: LRUStorageInstance<T>
  level: LevelStorageInstance<T>
  memory: MemoryStorageInstance<T>
}

type StorageType = keyof StorageTypeMap<unknown>

export { ComposedStorage } from './composed.js'
export { IPFSBlockStorage } from './ipfs-block.js'
export { LevelStorage } from './level.js'
export { LRUStorage } from './lru.js'
export { MemoryStorage } from './memory.js'

export type {
  ComposedStorageOptions,
  ComposedStorageInstance,
  IPFSBlockStorageOptions,
  IPFSBlockStorageInstance,
  LevelStorageOptions,
  LevelStorageInstance,
  LRUStorageOptions,
  LRUStorageInstance,
  MemoryStorageOptions,
  MemoryStorageInstance,
  StorageInstance,
  StorageType,
  StorageTypeMap,
}
