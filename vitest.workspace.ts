import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      environment: 'node',
      include: ['tests/**/*.test.{ts,js}'],
      maxConcurrency: 1,
      name: 'orbit',
      poolOptions: {
        threads: {
          isolate: true,
          singleThread: true,
        },
      },
      root: './packages/orbit',
      sequence: {
        concurrent: false,
        hooks: 'stack',
        setupFiles: 'list',
      },
      sequencer: {
        hooks: 'stack',
        setupFiles: 'list',
      },
      testTimeout: 5000,
    },
  },
])
