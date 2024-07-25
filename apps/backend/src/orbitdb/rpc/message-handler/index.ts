import { logger } from '@libp2p/logger'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'

import type {
  Handler,
  IMessageHandler,
  InternalTypes,
  //   MessageHandlerComponents,
  MessageHandlerOpts,
  RPCComponents,
} from '../types'
import type { Connection, PeerId, Stream } from '@libp2p/interface'

const log = {
  message: logger('libp2p:message-handler:messages'),
  general: logger('libp2p:message-handler'),
}

/**
 * MessageHandler class for managing peer-to-peer communication
 * @implements {IMessageHandler}
 */
export class MessageHandler implements IMessageHandler {
  private readonly components: RPCComponents
  private readonly options: MessageHandlerOpts
  private readonly internal: InternalTypes

  /**
   * Create a new MessageHandler instance
   * @param {MessageHandlerComponents} components - The components required for the message handler
   * @param {Partial<MessageHandlerOpts>} options - Optional configuration for the message handler
   */
  constructor(components: RPCComponents, options: Partial<MessageHandlerOpts> = {}) {
    this.components = components
    this.options = {
      protocol: options.protocol ?? '/message-handler/0.0.1',
    }
    this.internal = {
      writers: new Map(),
      handlers: new Set(),
      started: false,
    }
  }

  /**
   * Start the message handler
   * @returns {Promise<void>}
   * @example
   * const messageHandler = new MessageHandler(components)
   * await messageHandler.start()
   */
  async start(): Promise<void> {
    if (this.isStarted()) {
      return
    }

    await this.components.registrar.handle(this.options.protocol, ({ stream, connection }) => {
      this.handleStream(stream, connection)
    })

    this.internal.started = true
    log.general('started')
  }

  /**
   * Stop the message handler
   * @returns {Promise<void>}
   * @example
   * const messageHandler = new MessageHandler(components)
   * await messageHandler.start()
   * // ... some operations ...
   * await messageHandler.stop()
   */
  async stop(): Promise<void> {
    if (!this.isStarted()) {
      return
    }

    await this.components.registrar.unhandle(this.options.protocol)
    this.internal.handlers.clear()
    this.internal.started = false
    log.general('stopped')
  }

  /**
   * Check if the message handler is started
   * @returns {boolean} True if the message handler is started, false otherwise
   * @example
   * const messageHandler = new MessageHandler(components)
   * console.log(messageHandler.isStarted()) // false
   * await messageHandler.start()
   * console.log(messageHandler.isStarted()) // true
   */
  isStarted(): boolean {
    return this.internal.started
  }

  /**
   * Send a message to a connected peer
   * @param {Uint8Array} message - The message to send
   * @param {PeerId} peerId - The ID of the peer to send the message to
   * @returns {Promise<void>}
   * @example
   * const message = new TextEncoder().encode('Hello, peer!')
   * await messageHandler.send(message, peerId)
   */
  async send(message: Uint8Array, peerId: PeerId): Promise<void> {
    const writer = await this.establishStream(peerId)
    writer.push(message)
    log.message('sent message to: peer %p', peerId)
  }

  /**
   * Broadcast a message to all connected peers
   * @param {Uint8Array} message - The message to broadcast
   * @returns {Promise<PromiseSettledResult<void>[]>} A promise that resolves with the results of the broadcast
   * @example
   * const message = new TextEncoder().encode('Broadcast message')
   * const results = await messageHandler.broadcast(message)
   * console.log(`Broadcast to ${results.filter(r => r.status === 'fulfilled').length} peers`)
   */
  async broadcast(message: Uint8Array): Promise<PromiseSettledResult<void>[]> {
    return Promise.allSettled(
      this.components.connectionManager.getConnections()
        .map((c) => {
          return this.send(message, c.remotePeer)
        }),
    )
  }

  /**
   * Add a handler for incoming messages
   * @param {Handler} handler - The function to handle incoming messages
   * @example
   * messageHandler.handle((message, peerId) => {
   *   console.log(`Received message from ${peerId}: ${new TextDecoder().decode(message)}`)
   * })
   */
  handle(handler: Handler): void {
    this.internal.handlers.add(handler)
    log.general('added message handler')
  }

  /**
   * Remove a handler for incoming messages
   * @param {Handler} handler - The function to remove from handling incoming messages
   * @example
   * const myHandler = (message, peerId) => {
   *   console.log(`Received message from ${peerId}: ${new TextDecoder().decode(message)}`)
   * }
   * messageHandler.handle(myHandler)
   * // ... some time later ...
   * messageHandler.unhandle(myHandler)
   */
  unhandle(handler: Handler): void {
    this.internal.handlers.delete(handler)
    log.general('removed message handler')
  }

  private async establishStream(peer: PeerId) {
    const connection = this.components.connectionManager.getConnections()
      .find((c) => {
        return c.remotePeer.equals(peer)
      })

    if (!connection) {
      log.general.error('failed to open stream: peer is not connected')
      throw new Error('not connected')
    }

    const writer = this.internal.writers.get(peer.toString())
    if (writer) {
      return writer
    }

    log.general('opening new stream')

    try {
      const stream = await connection.newStream(this.options.protocol)

      return this.handleStream(stream, connection)
    }
    catch (error) {
      log.general.error('failed to open new stream: %o', error)
      throw error
    }
  }

  private handleStream(stream: Stream, connection: Connection) {
    const peerId = connection.remotePeer
    const existingWriter = this.internal.writers.get(peerId.toString())
    if (existingWriter) {
      return existingWriter
    }

    const writer = pushable()
    this.internal.writers.set(peerId.toString(), writer)

    pipe(stream, (source) => {
      return lp.decode(source)
    }, async (source) => {
      for await (const message of source) {
        for (const handler of this.internal.handlers) {
          log.message('received message from peer: %p', connection.remotePeer)
          handler(message.subarray(), connection.remotePeer)
        }
      }
    })
      .catch((error) => {
        log.general.error('failed to handle incoming stream: %o', error)
      })

    pipe(writer, (source) => {
      return lp.encode(source)
    }, stream)
      .finally(() => {
        log.general('stream ended to peer: %p', peerId)
        this.internal.writers.delete(peerId.toString())
      })

    return writer
  }
}

/**
 * Create a new MessageHandler instance
 * @param {Partial<MessageHandlerOpts>} options - Optional configuration for the message handler
 * @returns {(components: MessageHandlerComponents) => MessageHandler} A function that creates a new MessageHandler instance
 * @example
 * const createHandler = createMessageHandler({ protocol: '/custom-protocol/1.0.0' })
 * const messageHandler = createHandler(components)
 */
export function createMessageHandler(options?: Partial<MessageHandlerOpts>) {
  return (components: RPCComponents) => {
    return new MessageHandler(components, options)
  }
}
