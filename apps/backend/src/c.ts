import { createCli } from 'trpc-cli'
import { createContext } from './context'
import { router } from './router'

async function main() {
  const context = await createContext()
  const cli = createCli({
    router: router.data,
    context,
  })

  return cli.run()
}

main()
