import { logger } from '@libp2p/logger'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'

import type { RPCComponents } from '.'
import type { Connection, PeerId, Stream } from '@libp2p/interface'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Pushable } from 'it-pushable'

const log = {
  message: logger('libp2p:message-handler:messages'),
  general: logger('libp2p:message-handler'),
}

// Reduce Libp2p to only the properties we use.
export type MessageHandlerComponents = RPCComponents

export interface MessageHandlerOpts {
  protocol: string
}

export type Handler = (message: Uint8Array, peer: PeerId) => void

export class MessageHandler implements Startable {
  private readonly components: MessageHandlerComponents
  private readonly options: MessageHandlerOpts
  private readonly writers = new Map<string, Pushable<Uint8Array>>()
  private readonly handlers = new Set<Handler>()
  private started = false

  constructor(components: MessageHandlerComponents, options: Partial<MessageHandlerOpts> = {}) {
    this.components = components
    this.options = {
      protocol: options.protocol ?? '/message-handler/0.0.1',
    }
  }

  // Start the message handler.
  async start(): Promise<void> {
    if (this.isStarted()) {
      return
    }

    await this.components.registrar.handle(this.options.protocol, async ({ stream, connection }) => {
      this.handleStream(stream, connection)
    })

    this.started = true

    log.general('started')
  }

  // Stop the message handler.
  async stop(): Promise<void> {
    if (!this.isStarted()) {
      return
    }

    await this.components.registrar.unhandle(this.options.protocol)
    this.handlers.clear()

    this.started = false

    log.general('stopped')
  }

  isStarted(): boolean {
    return this.started
  }

  // Send a message to a connected peer.
  async send(message: Uint8Array, peerId: PeerId): Promise<void> {
    const writer = await this.establishStream(peerId)
    writer.push(message)

    log.message('sent message to: peer %p', peerId)
  }

  async broadcast(message: Uint8Array): Promise<PromiseSettledResult<void>[]> {
    return await Promise.allSettled(
      this.components.connectionManager.getConnections()
        .map((c) => {
          return this.send(message, c.remotePeer)
        }),
    )
  }

  // Handle an incomming message.
  handle(handler: Handler): void {
    this.handlers.add(handler)

    log.general('added message handler')
  }

  // Stop handling incomming messages with the handler.
  unhandle(handler: Handler): void {
    this.handlers.delete(handler)

    log.general('removed message handler')
  }

  // Establish a stream to a peer reusing an existing one if it already exists.
  private async establishStream(peer: PeerId) {
    // console.log('establishStream', this.components)

    const connection = this.components.connectionManager.getConnections()
      .find((c) => {
        return c.remotePeer.equals(peer)
      })

    if (connection == null) {
      log.general.error('failed to open stream: peer is not connected')
      throw new Error('not connected')
    }

    const writer = this.writers.get(peer.toString())
    if (writer != null) {
      // We already have a stream open.
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
    const { handlers, writers } = this

    const peerId = connection.remotePeer

    // Handle inputs.
    pipe(stream, (source) => {
      return lp.decode(source)
    }, async (source) => {
      for await (const message of source) {
        for (const handler of handlers) {
          log.message('received message from peer: %p', connection.remotePeer)
          handler(message.subarray(), connection.remotePeer)
        }
      }
    })
      .catch((error) => {
      // Do nothing
        log.general.error('failed to handle incoming stream: %o', error)
      })

    // Don't create a writer if one already exists.
    const eWriter = writers.get(peerId.toString())

    if (eWriter != null) {
      return eWriter
    }

    const writer = pushable()

    writers.set(peerId.toString(), writer);

    // Handle outputs.
    (async () => {
      try {
        await pipe(writer, (source) => {
          return lp.encode(source)
        }, stream)
      }
      finally {
        log.general('stream ended to peer: %p', peerId)
        writers.delete(peerId.toString())
      }
    })()

    return writer
  }
}

export function createMessageHandler(options?: Partial<MessageHandlerOpts>) {
  return (components: MessageHandlerComponents) => {
    return new MessageHandler(components, options)
  }
}
