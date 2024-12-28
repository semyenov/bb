import { dataRouter, usersRouter } from '../modules'
import { rootRouter } from './trpc'

export const router = rootRouter({
  data: dataRouter,
  users: usersRouter,
})

export type RootRouter = typeof router
