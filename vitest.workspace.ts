import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      root: './packages/orbit',
      include: ['tests/**/*.test.{ts,js}'],

      name: 'orbit',
      environment: 'node',
    },
  },
])
