import { createCli } from 'trpc-cli'
import { createContext } from './context'
import { router } from './router'
import { t } from './trpc'

async function main() {
  const context = await createContext()
  const cli = createCli({
    router: router.data,
    context,
    createCallerFactory: t.createCallerFactory(router),
  })

  return cli.run()
}

main()
