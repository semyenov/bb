/**
 * @packageDocumentation
 *
 * The {@link PerfService} implements the [perf protocol](https://github.com/libp2p/specs/blob/master/perf/perf.md), which can be used to measure transfer performance within and across libp2p implementations.
 *
 * @example
 *
 * ```typescript
 * import { noise } from '@chainsafe/libp2p-noise'
 * import { yamux } from '@chainsafe/libp2p-yamux'
 * import { mplex } from '@libp2p/mplex'
 * import { tcp } from '@libp2p/tcp'
 * import { createLibp2p, type Libp2p } from 'libp2p'
 * import { plaintext } from '@libp2p/plaintext'
 * import { perf, type Perf } from '@libp2p/perf'
 *
 * const ONE_MEG = 1024 * 1024
 * const UPLOAD_BYTES = ONE_MEG * 1024
 * const DOWNLOAD_BYTES = ONE_MEG * 1024
 *
 * async function createNode (): Promise<Libp2p<{ perf: Perf }>> {
 *   return createLibp2p({
 *     addresses: {
 *       listen: [
 *         '/ip4/0.0.0.0/tcp/0'
 *       ]
 *     },
 *     transports: [
 *       tcp()
 *     ],
 *     connectionEncryption: [
 *       noise(), plaintext()
 *     ],
 *     streamMuxers: [
 *       yamux(), mplex()
 *     ],
 *     services: {
 *       perf: perf()
 *     }
 *   })
 * }
 *
 * const libp2p1 = await createNode()
 * const libp2p2 = await createNode()
 *
 * for await (const output of libp2p1.services.perf.measurePerformance(libp2p2.getMultiaddrs()[0], UPLOAD_BYTES, DOWNLOAD_BYTES)) {
 *   console.info(output)
 * }
 *
 * await libp2p1.stop()
 * await libp2p2.stop()
 * ```
 */

import { Pulse as PulseClass } from './rpc'

import type { AbortOptions, ComponentLogger, EventHandler, Message, PeerId, TypedEventEmitter } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface PulseOptions extends AbortOptions {
  /**
   * By default measuring perf should include the time it takes to establish a
   * connection, so a new connection will be opened for every performance run.
   *
   * To override this and re-use an existing connection if one is present, pass
   * `true` here. (default: false)
   */
  reuseExistingConnection?: boolean
}

export interface PulseOutput {
  type: 'connection' | 'stream' | 'intermediary' | 'final'
  timeSeconds: number
  uploadBytes: number
  downloadBytes: number
}

export interface EventMap {
  msg: CustomEvent<Message>
}

export interface Pulse extends TypedEventEmitter<EventMap> {
  /**
   * Sends a message to a specified peer.
   * @param peer - The peer to send the message to.
   * @param msg - The message to send.
   */
  send: (peer: PeerId, msg: unknown) => Promise<void>
}

export interface PulseInit {
  protocolName?: string
  timeout?: number
  // maxInboundStreams?: number // Consider removing if not used
  // maxOutboundStreams?: number // Consider removing if not used
  runOnTransientConnection?: boolean
}

export interface PulseComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

export function pulse(init: PulseInit = {}): (components: PulseComponents) => Pulse {
  return (components: PulseComponents) => {
    return new PulseClass(components, init)
  }
}
