import type { ComponentLogger, PeerId } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Pushable } from 'it-pushable'

export interface RPCOpts {
  protocol: string
  timeout: number
}

export interface RPCError {
  code: number
  message: string
  data?: Uint8Array
}

export interface RPCComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

export interface MessageHandlerOpts {
  protocol: string
}

export type Handler = (message: Uint8Array, peer: PeerId) => void

export interface IMessageHandler extends Startable {
  send: (message: Uint8Array, peerId: PeerId) => Promise<void>
  broadcast: (message: Uint8Array) => Promise<PromiseSettledResult<void>[]>
  handle: (handler: Handler) => void
  unhandle: (handler: Handler) => void
}

export interface InternalTypes {
  writers: Map<string, Pushable<Uint8Array>>
  handlers: Set<Handler>
  started: boolean
}

export type RPCMethod = (params: Uint8Array | undefined, sender: PeerId) => Promise<Uint8Array | void> | Uint8Array | void

export interface Resolver {
  resolve: (result?: Uint8Array) => void
  reject: (error: any) => void
}

export interface RPCResponse {
  id: number
  result?: Uint8Array
  error?: {
    message: string
    code: number
    data?: any
  }
}
