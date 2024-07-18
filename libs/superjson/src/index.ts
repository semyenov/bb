import json from 'superjson'

import type { DataTransformerOptions } from '@trpc/server'

export const superjson = json as DataTransformerOptions
export const transformer = undefined
