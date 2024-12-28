import type { Infer } from '@typeschema/typebox'

import { Type } from '@sinclair/typebox'

export const MetaInfoSchema = Type.Object({
  description: Type.String(),
  legend: Type.String(),
  name: Type.String(),
})
export type MetaInfo = Infer<typeof MetaInfoSchema>

export const MetaSchema = Type.Object({
  createdAt: Type.Date(),
  hash: Type.String(),
  id: Type.String(),
  info: MetaInfoSchema,
  namespace: Type.String(),
  schemaId: Type.String(),
  updatedAt: Type.Date(),
  version: Type.String(),
})
export type Meta = Infer<typeof MetaSchema>
