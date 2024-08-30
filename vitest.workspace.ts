import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      root: './packages/orbit',
      include: ['tests/**/*.test.{ts,js}'],
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
      sequence: {
        setupFiles: 'list',
        concurrent: false,
        hooks: 'list',
      },
      sequencer: {
        setupFiles: 'list',
        hooks: 'list',
      },
      name: 'orbit',
      environment: 'node',
      testTimeout: 5000,
      maxConcurrency: 1,

    },

  },
])
