import { sign, verify } from '@regioni/lib-jose'
import { createLogger } from '@regioni/lib-logger'
import { Argument, Command } from 'commander'
import { consola } from 'consola'
import process from 'node:process'

import { ErrorUserKeyNotFound, ErrorUserNotFound } from './modules/users/errors'
import { UsersStore, type UserStoreInstance } from './modules/users/store'

const USERS_PATH = './.out/users'

const logger = createLogger({
  defaultMeta: {
    app: 'regioni',
    label: 'cli',
    service: 'root',
  },
})

async function createUser(
  userStore: UserStoreInstance,
  id: string,
) {
  const user = await userStore.createUser(id, {
    createdAt: new Date(),
    hash: '',
    id,
    info: {
      description: 'User description',
      legend: `${id}@regioni.io`,
      name: `User #${id}`,
    },
    namespace: 'users',

    roles: ['admin'],

    schemaId: 'user',
    status: 'active',

    updatedAt: new Date(),
    version: '1',
  })

  logger.info(
    'User created:',
    user,
  )
}

async function deleteUser(
  userStore: UserStoreInstance,
  id: string,
) {
  const user = await userStore.getUser(id)
  if (!user) {
    throw ErrorUserNotFound
  }

  const confirmation = await consola.prompt(
    `Are you sure you want to delete user ${id}? (yes/no)`,
    { initial: true, type: 'confirm' },
  )

  if (!confirmation) {
    return
  }

  await userStore.removeUser(id)

  logger.info(
    'User deleted:',
    id,
  )
}

async function getUser(
  userStore: UserStoreInstance,
  id: string,
) {
  const user = await userStore.getUser(id)

  logger.info(
    'getUser:',
    { user },
  )
}

async function signData(
  userStore: UserStoreInstance,
  id: string,
  data: string,
) {
  const user = await userStore.getUser(id)
  if (!user) {
    throw ErrorUserNotFound
  }
  else if (!user.keys || !user.keys[0]) {
    throw ErrorUserKeyNotFound
  }

  const jwt = await sign(user.jwk.privateKey, { data })

  logger.info(
    'signData:',
    { jwt },
  )
}

async function verifyData(
  userStore: UserStoreInstance,
  data: string,
) {
  const keyset = await userStore.getJWKSet()
  const { key, payload, protectedHeader } = await verify(data, keyset)

  logger.info(
    'verifyData:',
    { key, payload, protectedHeader },
  )
}

async function run() {
  const userStore = await UsersStore.create({
    base: USERS_PATH,
  })

  const program = new Command()
  const idArgument = new Argument(
    'id',
    'user id',
  )

  program
    .name('user-management-cli')
    .description('CLI for user management')
    .version('1.0.0')

  const userCommand = program
    .command('user')
    .description('User management commands')

  userCommand
    .command('create')
    .aliases(['add', 'new'])
    .addArgument(idArgument)
    .description('Create a new user')
    .action((id: string) => {
      return createUser(userStore, id)
    })

  userCommand
    .command('delete')
    .aliases([
      'remove',
      'rm',
      'del',
    ])
    .addArgument(idArgument)
    .description('Delete a user')
    .action((id: string) => {
      return deleteUser(userStore, id)
    })

  userCommand
    .command('get')
    .aliases(['show'])
    .addArgument(idArgument)
    .description('Get user information')
    .action((id: string) => {
      return getUser(userStore, id)
    })

  userCommand
    .command('sign')
    .aliases(['use', 'sign-data'])
    .addArgument(idArgument)
    .addArgument(new Argument('data', 'data to sign'))
    .description('Sign data')
    .action((id: string, data: string) => {
      return signData(userStore, id, data)
    })

  userCommand
    .command('verify')
    .aliases(['test', 'verify-data'])
    .addArgument(new Argument('data', 'JWT to verify'))
    .description('Verify data signature')
    .action((data: string) => {
      return verifyData(userStore, data)
    })

  await program.parseAsync(process.argv)
}

run()
  .catch((error) => {
    logger.error('An error occurred:', error)
    process.exit(1)
  })
