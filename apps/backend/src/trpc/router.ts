import { dataRouter } from '../modules/data'
import { usersRouter } from '../modules/users'
import { rootRouter } from '../trpc'

// merge routers together
export const router = rootRouter({
  data: dataRouter,
  users: usersRouter,
})

export type RootRouter = typeof router
