import type { DataTransformerOptions } from '@trpc/server'

import json from 'superjson'

export const superjson = json as DataTransformerOptions
export const transformer = undefined
