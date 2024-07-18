import { Type } from '@sinclair/typebox'

import { MetaSchema } from '../meta/schema'

import type { Infer } from '@typeschema/typebox'

export const UserSchema = Type.Composite([
  MetaSchema,
  Type.Object({
    jwk: Type.Optional(Type.Any()),
    keys: Type.Array(Type.String()),
    roles: Type.Array(Type.String()),
    status: Type.String(),
  }),
])

export type User = Infer<typeof UserSchema>
