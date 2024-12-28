import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      root: './packages/orbit',
      include: ['tests/**/*.test.{ts,js}'],
      poolOptions: {
        threads: {
          singleThread: true,
          isolate: true,
        },
      },
      sequence: {
        setupFiles: 'list',
        concurrent: false,
        hooks: 'stack',
      },
      sequencer: {
        setupFiles: 'list',
        hooks: 'stack',
      },
      name: 'orbit',
      environment: 'node',
      testTimeout: 5000,
      maxConcurrency: 1,
    },
  },
])
