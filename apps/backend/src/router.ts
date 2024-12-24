import { dataRouter } from './modules/data/router'
import { usersRouter } from './modules/users/router'
import { rootRouter } from './trpc'

// merge routers together
export const router = rootRouter({
  data: dataRouter,
  users: usersRouter,
})

export type Router = typeof router
