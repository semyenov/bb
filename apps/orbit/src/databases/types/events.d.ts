/* eslint-disable no-unused-vars */

import type { DatabaseInstance } from './database'

export interface EventsDoc<T = unknown> {
  key: string
  value: T
}

export interface EventsIteratorOptions {
  gt?: string
  gte?: string
  lt?: string
  lte?: string
  amount?: number
}

interface EventsInstance<T = unknown> extends DatabaseInstance<T> {
  type: 'events'

  add: (value: T) => Promise<string>
  all: () => Promise<Omit<EventsDoc<T>, 'key'>[]>
  get: (hash: string) => Promise<T | null>
  iterator: (
    options?: EventsIteratorOptions,
  ) => AsyncGenerator<EventsDoc<T>, void>
}
