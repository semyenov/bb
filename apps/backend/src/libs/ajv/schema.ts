import type { JSONSchemaType } from 'ajv'

export const userSchema: JSONSchemaType<{
  status: string
  date: string
}> = {
  additionalProperties: false,
  properties: {
    date: {
      format: 'date-time',
      type: 'string',
    },
    status: {
      type: 'string',
    },
  },
  required: ['status'],
  type: 'object',
}
