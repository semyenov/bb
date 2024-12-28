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
  connection: RedisStoreConnection
  prefix: string
}

export interface RedisCRUDInstance<T extends RedisJSON> {
  deleteMany: (...ids: string[]) => Promise<boolean>
  deleteOne: (id: string) => Promise<boolean>
  findMany: (...ids: string[]) => Promise<T[]>
  findOne: (id: string) => Promise<T | undefined>
  getAll: () => Promise<T[]>
  getKeys: () => Promise<string[]>
  insertMany: (items: JsonMSetItem[]) => Promise<T[]>
  insertOne: (item: JsonMSetItem) => Promise<T>
  keyExists: (id: string) => Promise<boolean>
}

export interface RedisStore {
  data: RedisCRUDInstance<RedisJSON>
  disconnect: () => Promise<void>
  meta: RedisCRUDInstance<Meta>
  schemas: RedisCRUDInstance<RedisJSON>

  users: RedisCRUDInstance<User>
}
