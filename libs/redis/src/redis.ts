import type {
  Meta,
  User,
} from '@regioni/backend'

import { createClient } from 'redis'

import type {
  JsonMSetItem,
  RedisCRUDInstance,
  RedisCRUDOptions,
  RedisJSON,
  RedisStore,
  RedisStoreOptions,
} from './types.d'

export async function createRedisStore(options: RedisStoreOptions): Promise<RedisStore> {
  const connection = createClient(options)
  await connection.connect()

  return {
    data: createCRUD({ connection, prefix: 'data' }),
    disconnect: connection.disconnect,
    meta: createCRUD<Meta>({ connection, prefix: 'meta' }),
    schemas: createCRUD({ connection, prefix: 'schemas' }),

    users: createCRUD<User>({ connection, prefix: 'users' }),
  }
}

export function createCRUD<T extends RedisJSON>({
  connection,
  prefix = '',
}: RedisCRUDOptions): RedisCRUDInstance<T> {
  const formatPattern = (...args: string[]) => {
    return [prefix, ...args].join(':')
  }

  const keyExists = async (id: string) => {
    const pattern = formatPattern(id)
    const exists = await connection.exists(pattern)

    return exists === 1
  }

  const getKeys = async () => {
    const pattern = formatPattern('*')

    return await connection.keys(pattern)
  }

  const getAll = async () => {
    const userKeys = await getKeys()
    if (userKeys.length === 0) {
      return []
    }

    const items = await connection.json.mGet(userKeys, '$')

    return items.flat() as T[]
  }

  const insertOne = async ({
    key,
    path,
    value,
  }: JsonMSetItem) => {
    const pattern = formatPattern(String(key))
    await connection.json.set(
      pattern,
      String(path),
      value,
    )

    return value as T
  }

  const insertMany = async (items: JsonMSetItem[]): Promise<T[]> => {
    const pattern = items.map(({
      key,
      path,
      value,
    }) => {
      return {
        key: formatPattern(String(key)),
        path: String(path),
        value,
      }
    })

    await connection.json.mSet(pattern)

    return items.map(({
      value,
    }) => {
      return value
    }) as T[]
  }

  const findOne = async (id: string) => {
    const pattern = formatPattern(id)
    const item = (await connection.json.get(pattern)) as T
    if (!item) {
      return
    }

    return item as T
  }
  const findMany = async (...ids: string[]) => {
    const pattern = ids.map((id) => {
      return formatPattern(id)
    })
    const items = await connection.json.mGet(pattern, '$')

    return items as T[]
  }

  const deleteOne = async (id: string) => {
    const pattern = formatPattern(id)
    await connection.del(pattern)

    return true
  }
  const deleteMany = async (...ids: string[]) => {
    const pattern = ids.map((id) => {
      return formatPattern(id)
    })
    await connection.del(pattern)

    return true
  }

  return {
    deleteMany,
    deleteOne,
    findMany,

    findOne,
    getAll,

    getKeys,
    insertMany,

    insertOne,
    keyExists,
  }
}
