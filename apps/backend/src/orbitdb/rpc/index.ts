import { logger } from '@libp2p/logger'

import { RPCException } from './exception'
// import { RPCMessage } from './RPCProtocol.js'
import {
  createMessageHandler,
} from './message-handler'
import * as Messages from './messages'
import { RPCMessage } from './pb'

import type {
  MessageHandler,
} from './message-handler'
import type { ComponentLogger, Logger, PeerId } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Startable } from '@libp2p/interfaces/startable'

const log = {
  general: logger('libp2p:rpc'),
}

export interface RPCOpts {
  protocol: string
  timeout: number
}

export interface RPCComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

export type RPCMethod = (params: Uint8Array | undefined, sender: PeerId) => Promise<Uint8Array | void> | Uint8Array | void

interface Resolver {
  resolve: (result?: Uint8Array) => void
  reject: (error: any) => void
}

function genMsgId() {
  let id = 0

  return () => {
    return id++
  }
}

export class RPC implements Startable {
  private readonly options: RPCOpts
  private readonly methods = new Map<string, RPCMethod>()
  private readonly msgPromises = new Map<number, Resolver>()
  private readonly handler: MessageHandler
  private started = false
  private readonly log: Logger
  private readonly genMsgId = genMsgId()

  constructor(components: RPCComponents, options: Partial<RPCOpts> = {}) {
    this.options = {
      protocol: options.protocol ?? '/rpc/1.0.0',
      timeout: options.timeout ?? 10000,
    }
    // this.registrar = components.registrar

    this.handler = createMessageHandler({ protocol: this.options.protocol })(components)
    this.log = components.logger.forComponent('libp2p:rpc')
  }

  async start(): Promise<void> {
    if (this.isStarted()) {
      return
    }

    await this.handler.start()

    this.handler.handle((message, peer) => {
      this.handleMessage(RPCMessage.decode(message), peer)
    })

    this.started = true

    this.log('started')
  }

  async stop(): Promise<void> {
    if (!this.isStarted()) {
      return
    }

    await this.handler.stop()

    // Reject the open promises.
    for (const promise of this.msgPromises.values()) {
      promise.reject(new RPCException('RPC module stopped', -32001))
    }

    this.msgPromises.clear()
    this.methods.clear()

    this.started = false

    this.log('stopped')
  }

  isStarted(): boolean {
    return this.started
  }

  addMethod(name: string, method: RPCMethod): void {
    this.methods.set(name, method)
  }

  hasMethod(name: string): boolean {
    return this.methods.has(name)
  }

  removeMethod(name: string): boolean {
    return this.methods.delete(name)
  }

  async request(peer: PeerId, name: string, data?: Uint8Array): Promise<Uint8Array | undefined> {
    const messageId = this.genMsgId()

    try {
      await this.handler.send(Messages.createRequest(name, messageId, data), peer)
      this.log('request \'%s\' sent to peer: %p', name, peer)
    }
    catch (error) {
      this.log.error('failed to send message: %o', error)
      throw new RPCException((error as Error).message, -32000)
    }

    if (this.options.timeout < 0) {
      return
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.msgPromises.delete(messageId)
        reject(new RPCException('Request timed out', -32003))
      }, this.options.timeout)

      this.msgPromises.set(messageId, {
        resolve: (result) => {
          clearTimeout(timeoutId)
          resolve(result)
        },
        reject: (error) => {
          clearTimeout(timeoutId)
          reject(error)
        },
      })
    })
  }

  notify(peer: PeerId, name: string, params?: Uint8Array): void {
    this.handler.send(Messages.createNotification(name, params), peer)
      .catch(() => {
        this.log.error('failed to send message')
      })

    this.log('notify \'%s\' on peer: %p', name, peer)
  }

  // Handle receiving a messsage calling RPC methods or resolving responses.
  private async handleMessage(message: any, peer: PeerId) {
    const { request, response } = message

    if (request != null) {
      const method = this.methods.get(request.name)

      if (!method) {
        if (request.id == null) {
          return
        }

        return await this.handler.send(Messages.createMethodNotFoundError(request.id), peer)
      }

      let result: Uint8Array | undefined
      let error: RPCException | null = null

      try {
        log.general('method \'%s\' called by peer: %p', request.name, peer)
        result = await method(request.params, peer) ?? undefined
      }
      catch (error_) {
        log.general.error('method \'%s\' threw error: %o', error_)

        if (error_ instanceof RPCException) {
          error = error_
        }
        else if (error_ instanceof Error) {
          error = new RPCException(error_.message, 0)
          error.stack = error_.stack
        }
        else {
          try {
            error = new RPCException(JSON.stringify(error_), -32002)
          }
          catch {
            error = new RPCException('Unknown error', -32002)
          }
        }
      }

      if (request.id == null) {
        return
      }

      if (error != null) {
        return await this.handler.send(Messages.createError(request.id, error.message, error.code), peer)
      }

      return await this.handler.send(Messages.createResponse(request.id, result), peer)
    }

    if (response) {
      const resolver = this.msgPromises.get(response.id)

      if (resolver == null) {
        return
      }

      this.msgPromises.delete(response.id)

      if (response.error == null) {
        return resolver.resolve(response.result)
      }

      resolver.reject(new RPCException(response.error.message, response.error.code, response.error.data))
    }
  }
}

export function createRPC(options?: Partial<RPCOpts>) {
  return (components: RPCComponents) => {
    return new RPC(components, options)
  }
}
