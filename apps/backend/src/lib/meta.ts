import type { TrpcCliMeta } from 'trpc-cli'

export interface Meta extends TrpcCliMeta {
  label: string
  service: string
  version: string
}

export const meta: Meta = {
  label: 'root',
  service: 'server',
  version: '1.0.0',
}
