import * as dagCbor from '@ipld/dag-cbor'
import { TypedEventEmitter } from '@libp2p/interface'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'

import { DEFAULT_TIMEOUT, PROTOCOL_NAME, RUN_ON_TRANSIENT_CONNECTION } from './constants.js'

import type { EventMap, PulseComponents, PulseInit, Pulse as PulseInterface } from './index.js'
import type { Logger, Message, PeerId, Startable } from '@libp2p/interface'
import type { IncomingStreamData } from '@libp2p/interface-internal'
import type { Pushable } from 'it-pushable'

export function encode(source: unknown) {
  return dagCbor.encode(source)
}

export function decode(buf: Uint8Array): Message {
  return dagCbor.decode(buf)
}

export class Pulse extends TypedEventEmitter<EventMap> implements Startable, PulseInterface {
  private readonly log: Logger
  public readonly protocol: string
  private readonly components: PulseComponents
  private started: boolean
  private readonly timeout: number
  private readonly runOnTransientConnection: boolean
  private readonly outboundStreams = new Map<string, Pushable<Uint8Array>>()

  constructor(components: PulseComponents, init: PulseInit = {}) {
    super()
    this.components = components
    this.log = components.logger.forComponent('libp2p:pulse')
    this.started = false
    this.protocol = init.protocolName ?? PROTOCOL_NAME
    this.timeout = init.timeout ?? DEFAULT_TIMEOUT
    this.runOnTransientConnection = init.runOnTransientConnection ?? RUN_ON_TRANSIENT_CONNECTION
  }

  readonly [Symbol.toStringTag] = '@libp2p/pulse'

  async start(): Promise<void> {
    await this.components.registrar.handle(this.protocol, (data: IncomingStreamData) => {
      void this.handleConnection(data)
        .catch((error) => {
          this.log.error('error handling perf protocol message', error)
        })
    }, {
      runOnTransientConnection: this.runOnTransientConnection,
    })
    this.started = true
  }

  async stop(): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  isStarted(): boolean {
    return this.started
  }

  private async getOutboundStream(peer: PeerId) {
    const connection = this.components.connectionManager.getConnections()
      .find((c) => {
        return c.remotePeer.equals(peer)
      })

    if (!connection) {
      this.log.error('failed to open stream: peer is not connected')
      throw new Error('not connected')
    }
    const outboundStream = this.outboundStreams.get(peer.toString())
    if (outboundStream) {
      return outboundStream
    }
    const signal = AbortSignal.timeout(this.timeout)
    const stream = await connection.newStream(this.protocol, {
      signal,
    })

    return this.handleConnection({ connection, stream })
  }

  private async handleConnection(data: IncomingStreamData) {
    const { stream, connection } = data
    let outboundStream = this.outboundStreams.get(connection.remotePeer.toString())
    if (outboundStream) {
      return outboundStream
    }
    outboundStream = pushable()

    this.outboundStreams.set(connection.remotePeer.toString(), outboundStream)

    pipe(stream, (source) => {
      return lp.decode(source)
    }, async (source) => {
      for await (const message of source) {
        super.dispatchEvent(new CustomEvent<Message>('msg', { detail: decode(message.subarray()) }))
      }
    })

    pipe(outboundStream, (source) => {
      return lp.encode(source)
    }, stream.sink)
      .finally(() => {
        this.log('closing stream')
        this.outboundStreams.delete(connection.remotePeer.toString())
      })

    return outboundStream
  }

  async send(peerId: PeerId, msg: unknown, _options?: any) {
    const outboundStream = await this.getOutboundStream(peerId)

    outboundStream.push(encode(msg))
  }
}
