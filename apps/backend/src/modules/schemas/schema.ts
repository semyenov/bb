import { z } from 'zod'
import { Infer } from '@regioni/config'

export const JsonSchemaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  schema: z.record(z.unknown()).refine(
    (val) => {
      try {
        JSON.parse(JSON.stringify(val))
        return true
      } catch {
        return false
      }
    },
    { message: 'Invalid JSON schema' }
  ),
  version: z.string().default('1.0.0'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().optional()
})

export type JsonSchema = Infer<typeof JsonSchemaSchema>

export const JsonSchemaInputSchema = JsonSchemaSchema.omit({ 
  id: true, 
  createdAt: true 
})

export type JsonSchemaInput = Infer<typeof JsonSchemaInputSchema>
