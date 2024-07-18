import type { JSONSchemaType } from 'ajv'
// import type { TestUserInfo } from 'types'

export const userSchema: JSONSchemaType<{
  status: string
  // info?: TestUserInfo
  date: string
}> = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
    },
    info: {
      $ref: 'TestUserInfo',
    },
    date: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: ['status'],
  additionalProperties: false,
}
