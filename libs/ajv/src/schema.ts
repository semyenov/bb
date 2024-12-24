import type { JSONSchemaType } from 'ajv'

export const userSchema: JSONSchemaType<{
  status: string
  date: string
}> = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
    },
    date: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: ['status'],
  additionalProperties: false,
}
