import type { Infer } from '@typeschema/typebox'

import { Type } from '@sinclair/typebox'

export const MetaInfoSchema = Type.Object({
  name: Type.String(),
  legend: Type.String(),
  description: Type.String(),
})
export type MetaInfo = Infer<typeof MetaInfoSchema>

export const MetaSchema = Type.Object({
  id: Type.String(),
  hash: Type.String(),
  namespace: Type.String(),
  schemaId: Type.String(),
  version: Type.String(),
  updatedAt: Type.Date(),
  createdAt: Type.Date(),
  info: MetaInfoSchema,
})
export type Meta = Infer<typeof MetaSchema>
