import { Type } from '@sinclair/typebox'

import type { Infer } from '@typeschema/typebox'

export const ConfigSchema = Type.Object({
  userstore: Type.Object({
    base: Type.String(),
    password: Type.String(),
  }),
})
export type Config = Infer<typeof ConfigSchema>
