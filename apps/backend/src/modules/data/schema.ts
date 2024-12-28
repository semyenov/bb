import type { Infer } from '@typeschema/typebox'

import { Type } from '@sinclair/typebox'

export const PostItemInputSchema = Type.Object({
  data: Type.Unknown(),
  id: Type.String(),
  path: Type.String(),
})
export type PostItemInput = Infer<typeof PostItemInputSchema>

export const GetItemInputSchema = Type.Object({
  id: Type.String(),
})
export type GetItemInput = Infer<typeof GetItemInputSchema>
