import type {
  RedisClientOptions,
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from 'redis'

import { createClient } from 'redis'

export async function createRedisStore(
  options: RedisClientOptions<RedisModules, RedisFunctions, RedisScripts>,
) {
  const connection = createClient(options)
  await connection.connect()

  function createCRUD<T = unknown>(prefix = '') {
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

    const insertOne = async (_id: string, data: T) => {
      const pattern = formatPattern(_id)
      const item = { ...data, _id }
      await connection.json.set(pattern, '$', item)

      return item as T
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
      keyExists,
      getKeys,

      getAll,

      insertOne,

      findOne,
      findMany,

      deleteOne,
      deleteMany,
    }
  }

  return {
    data: createCRUD('data'),
    schemas: createCRUD('schemas'),
    disconnect: () => {
      return connection.disconnect()
    },
  }
}
