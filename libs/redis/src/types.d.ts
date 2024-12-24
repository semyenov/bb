import type {
  RedisCommandArgument,
  RedisFunctions,
  RedisScripts,
} from '@redis/client/dist/lib/commands'

import type {
  RedisJSON,
} from '@redis/json/dist/commands'

import type {
  RedisClientOptions,
  RedisClientType,
  RedisDefaultModules,
} from 'redis'

export type {
  RedisJSON,
} from '@redis/json/dist/commands'

export type {
  RedisClientOptions,
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from 'redis'

export type JsonMSetItem = {
  key: RedisCommandArgument
  path: RedisCommandArgument
  value: RedisJSON
}

export type RedisStoreConnection = RedisClientType<
  RedisDefaultModules,
  RedisFunctions,
  RedisScripts
>

export type RedisStoreOptions = RedisClientOptions<
  RedisDefaultModules,
  RedisFunctions,
  RedisScripts
>

export interface RedisCRUDOptions {
  prefix: string
  connection: RedisStoreConnection
}

export interface RedisCRUDInstance<T extends RedisJSON> {
  keyExists: (id: string) => Promise<boolean>
  getKeys: () => Promise<string[]>
  getAll: () => Promise<T[]>
  insertOne: (item: JsonMSetItem) => Promise<T>
  insertMany: (items: JsonMSetItem[]) => Promise<T[]>
  findOne: (id: string) => Promise<T | undefined>
  findMany: (...ids: string[]) => Promise<T[]>
  deleteOne: (id: string) => Promise<boolean>
  deleteMany: (...ids: string[]) => Promise<boolean>
}

export interface RedisStore {
  meta: RedisCRUDInstance<Meta>
  users: RedisCRUDInstance<User>
  data: RedisCRUDInstance<RedisJSON>
  schemas: RedisCRUDInstance<RedisJSON>

  disconnect: () => Promise<void>
}
