import { RPCException } from './exception'
import { createMessageHandler } from './message-handler'
import * as Messages from './messages'
import { RPCMessage } from './pb'

import type { MessageHandler } from './message-handler'
import type { RPCRequest } from './pb'
import type { RPCComponents, RPCMethod, RPCOpts, RPCResponse, Resolver } from './types'
import type { Logger, PeerId } from '@libp2p/interface'
import type { Startable } from '@libp2p/interfaces/startable'

/**
 * Generates unique message IDs
 * @returns {() => number} A function that returns incrementing message IDs
 */
function genMsgId(): () => number {
  let id = 0

  return () => {
    return id++
  }
}

/**
 * RPC class implementing the Startable interface
 * @class
 * @implements {Startable}
 */
export class RPC implements Startable {
  private readonly options: RPCOpts
  private readonly methods = new Map<string, RPCMethod>()
  private readonly msgPromises = new Map<number, Resolver>()
  private readonly handler: MessageHandler
  private started = false
  private readonly log: Logger
  private readonly genMsgId = genMsgId()

  /**
   * Creates an instance of RPC
   * @param {RPCComponents} components - The components required for RPC
   * @param {Partial<RPCOpts>} [options] - Optional configuration for RPC
   * @example
   * const rpc = new RPC(components, { protocol: '/custom/rpc/1.0.0', timeout: 5000 })
   */
  constructor(components: RPCComponents, options: Partial<RPCOpts> = {}) {
    this.options = {
      protocol: options.protocol ?? '/rpc/1.0.0',
      timeout: options.timeout ?? 10000,
    }
    this.handler = createMessageHandler({ protocol: this.options.protocol })(components)
    this.log = components.logger.forComponent('libp2p:rpc')
  }

  /**
   * Starts the RPC service
   * @returns {Promise<void>}
   * @example
   * await rpc.start()
   */
  async start(): Promise<void> {
    if (this.isStarted()) {
      return
    }

    await this.handler.start()
    this.handler.handle((message, peer) => {
      return this.handleMessage(RPCMessage.decode(message), peer)
    })
    this.started = true
    this.log('started')
  }

  /**
   * Stops the RPC service
   * @returns {Promise<void>}
   * @example
   * await rpc.stop()
   */
  async stop(): Promise<void> {
    if (!this.isStarted()) {
      return
    }

    await this.handler.stop()
    for (const promise of this.msgPromises.values()) {
      promise.reject(new RPCException('RPC module stopped', -32001))
    }
    this.msgPromises.clear()
    this.methods.clear()
    this.started = false
    this.log('stopped')
  }

  /**
   * Checks if the RPC service is started
   * @returns {boolean} True if the service is started, false otherwise
   * @example
   * if (rpc.isStarted()) {
   *   console.log('RPC service is running')
   * }
   */
  isStarted(): boolean {
    return this.started
  }

  /**
   * Adds a method to the RPC service
   * @param {string} name - The name of the method
   * @param {RPCMethod} method - The method implementation
   * @example
   * rpc.addMethod('echo', (params) => params)
   */
  addMethod(name: string, method: RPCMethod): void {
    this.methods.set(name, method)
  }

  /**
   * Checks if a method exists in the RPC service
   * @param {string} name - The name of the method
   * @returns {boolean} True if the method exists, false otherwise
   * @example
   * if (rpc.hasMethod('echo')) {
   *   console.log('Echo method is available')
   * }
   */
  hasMethod(name: string): boolean {
    return this.methods.has(name)
  }

  /**
   * Removes a method from the RPC service
   * @param {string} name - The name of the method to remove
   * @returns {boolean} True if the method was removed, false if it didn't exist
   * @example
   * if (rpc.removeMethod('echo')) {
   *   console.log('Echo method was removed')
   * }
   */
  removeMethod(name: string): boolean {
    return this.methods.delete(name)
  }

  /**
   * Sends an RPC request to a peer
   * @param {PeerId} peer - The peer to send the request to
   * @param {string} name - The name of the method to call
   * @param {Uint8Array} [data] - Optional data to send with the request
   * @returns {Promise<Uint8Array | undefined>} A promise that resolves with the result of the request
   * @example
   * const result = await rpc.request(peerId, 'echo', new TextEncoder().encode('Hello'))
   */
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

  /**
   * Sends a notification to a peer (one-way RPC call)
   * @param {PeerId} peer - The peer to notify
   * @param {string} name - The name of the method to call
   * @param {Uint8Array} [params] - Optional parameters for the notification
   * @example
   * rpc.notify(peerId, 'update', new TextEncoder().encode('New data available'))
   */
  notify(peer: PeerId, name: string, params?: Uint8Array): void {
    this.handler.send(Messages.createNotification(name, params), peer)
      .catch(() => {
        this.log.error('failed to send message')
      })
    this.log('notify \'%s\' on peer: %p', name, peer)
  }

  private async handleMessage(message: RPCMessage, peer: PeerId) {
    if (message.request) {
      await this.handleRequest(message.request!, peer)
    }
    else if (message.response) {
      this.handleResponse(message.response)
    }
  }

  private async handleRequest(request: RPCRequest, peer: PeerId) {
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
      this.log('method \'%s\' called by peer: %p', request.name, peer)
      result = await method(request.params, peer) ?? undefined
    }
    catch (error_) {
      this.log.error('method \'%s\' threw error: %o', error_)
      error = this.createRPCException(error_)
    }

    if (request.id == null) {
      return
    }

    if (error != null) {
      return await this.handler.send(Messages.createError(request.id, error.message, error.code), peer)
    }

    return await this.handler.send(Messages.createResponse(request.id, result), peer)
  }

  private handleResponse(response: RPCResponse) {
    const resolver = this.msgPromises.get(response.id)
    if (!resolver) {
      return
    }

    this.msgPromises.delete(response.id)

    if (response.error) {
      resolver.reject(new RPCException(response.error.message, response.error.code, response.error.data))
    }
    else {
      resolver.resolve(response.result)
    }
  }

  private createRPCException(error: unknown): RPCException {
    if (error instanceof RPCException) {
      return error
    }
    if (error instanceof Error) {
      const rpcError = new RPCException(error.message, 0)
      rpcError.stack = error.stack

      return rpcError
    }
    try {
      return new RPCException(JSON.stringify(error), -32002)
    }
    catch {
      return new RPCException('Unknown error', -32002)
    }
  }
}

/**
 * Creates an RPC instance with the given options
 * @param {Partial<RPCOpts>} [options] - Optional configuration for the RPC instance
 * @returns {(components: RPCComponents) => RPC} A function that creates an RPC instance
 * @example
 * const createRPCInstance = createRPC({ timeout: 5000 })
 * const rpc = createRPCInstance(components)
 */
export function createRPC(options?: Partial<RPCOpts>) {
  return (components: RPCComponents) => {
    return new RPC(components, options)
  }
}
