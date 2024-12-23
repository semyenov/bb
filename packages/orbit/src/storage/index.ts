import type { StorageInstance } from './types'
import { ComposedStorage, type ComposedStorageOptions } from './composed'
import { IPFSBlockStorage, type IPFSBlockStorageOptions } from './ipfs-block'
import { LevelStorage, type LevelStorageOptions } from './level'
import { LRUStorage, type LRUStorageOptions } from './lru'

import { MemoryStorage } from './memory'

export {
  ComposedStorage,
  IPFSBlockStorage,
  LevelStorage,
  LRUStorage,
  MemoryStorage,
}
export type {
  ComposedStorageOptions,
  IPFSBlockStorageOptions,
  LevelStorageOptions,
  LRUStorageOptions,
  StorageInstance,
}
