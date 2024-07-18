import process from 'node:process'

import { sign, verify } from '@regioni/lib-jose'
import { createLogger } from '@regioni/lib-logger'
import { Argument, Command } from 'commander'
import { consola } from 'consola'

import { ErrorUserKeyNotFound, ErrorUserNotFound } from './modules/users/errors'
import { type UserStoreInstance, UsersStore } from './modules/users/store'

const ID_ARGUMENT_DESCRIPTION = 'user id'

const logger = createLogger({
  defaultMeta: {
    app: 'regioni',
    service: 'root',
    label: 'cli',
  },
})

const usersPath = './.out/users'

async function createUser(userStore: UserStoreInstance, id: string) {
  const user = await userStore.createUser(id, {
    id,
    hash: '',
    namespace: 'users',
    schemaId: 'user',
    version: '1',

    info: {
      name: `User #${id}`,
      description: 'User description',
      legend: `${id}@regioni.io`,
    },

    roles: ['admin'],
    status: 'active',

    createdAt: new Date(),
    updatedAt: new Date(),
  })

  logger.info('User created:', user)
}

async function deleteUser(userStore: UserStoreInstance, id: string) {
  const user = await userStore.getUser(id)
  if (!user) {
    throw ErrorUserNotFound
  }

  const confirmation = await consola.prompt(
    `Are you sure you want to delete user ${id}? (yes/no)`,
    { type: 'confirm', initial: true },
  )

  if (!confirmation) {
    return
  }

  await userStore.removeUser(id)
}

async function getUser(userStore: UserStoreInstance, id: string) {
  const user = await userStore.getUser(id)
  logger.info('getUser:', { user })
}

async function signData(
  userStore: UserStoreInstance,
  id: string,
  data: string,
) {
  const { user, jwk } = await userStore.getUser(id)
  if (!user) {
    throw ErrorUserNotFound
  } else if (!user.keys || !user.keys[0]) {
    throw ErrorUserKeyNotFound
  }

  const jwt = await sign(jwk, { data })
  logger.info('signData:', { jwt })
}

async function verifyData(userStore: UserStoreInstance, data: string) {
  const keyset = await userStore.createJWKSet()
  const { payload, protectedHeader, key } = await verify(data, keyset, {})

  logger.info('verifyData:', { payload, protectedHeader, key })
}

async function run() {
  const userStore = await UsersStore({ base: usersPath })

  const program = new Command()

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
    .addArgument(new Argument('id', ID_ARGUMENT_DESCRIPTION))
    .description('Create a new user')
    .action((id) => createUser(userStore, id))

  userCommand
    .command('delete')
    .aliases(['remove', 'rm', 'del'])
    .addArgument(new Argument('id', ID_ARGUMENT_DESCRIPTION))
    .description('Delete a user')
    .action((id) => deleteUser(userStore, id))

  userCommand
    .command('get')
    .aliases(['show'])
    .addArgument(new Argument('id', ID_ARGUMENT_DESCRIPTION))
    .description('Get user information')
    .action((id) => getUser(userStore, id))

  userCommand
    .command('sign')
    .aliases(['use', 'sign-data'])
    .addArgument(new Argument('id', ID_ARGUMENT_DESCRIPTION))
    .addArgument(new Argument('data', 'data to sign'))
    .description('Sign data')
    .action((id, data) => signData(userStore, id, data))

  userCommand
    .command('verify')
    .aliases(['test', 'verify-data'])
    .addArgument(new Argument('data', 'JWT to verify'))
    .description('Verify data signature')
    .action((data) => verifyData(userStore, data))

  await program.parseAsync(process.argv)
}

run().catch((error) => {
  logger.error('An error occurred:', error)
  process.exit(1)
})
