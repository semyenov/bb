import type { Infer } from '@typeschema/typebox'
import { Type } from '@sinclair/typebox'

export const ConfigSchema = Type.Object({
  userstore: Type.Object({
    base: Type.String(),
    password: Type.String(),
  }),
})
export type Config = Infer<typeof ConfigSchema>
