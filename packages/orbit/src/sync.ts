import type {
  EventHandler,
  Message,
  SignedMessage,
  Startable,
  StreamHandler,
  SubscriptionChangeData,
} from '@libp2p/interface'
import type { Sink, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

import { TypedEventEmitter } from '@libp2p/interface'
import { PeerSet } from '@libp2p/peer-collections'
import { pipe } from 'it-pipe'
import PQueue from 'p-queue'
import { TimeoutController } from 'timeout-abort-controller'

import type { EntryInstance, LogInstance } from './oplog'
import type { OrbitDBHeliaInstance, PeerId } from './vendor.d'

import { SYNC_PROTOCOL, SYNC_TIMEOUT } from './constants'
import { join } from './utils'

export interface SyncEvents<T> {
  error: ErrorEvent
  join: CustomEvent<{ peerId: PeerId, heads: EntryInstance<T>[] }>
  leave: CustomEvent<{ peerId: PeerId }>
}

export interface SyncOptions<T> {
  events?: TypedEventEmitter<SyncEvents<T>>
  ipfs: OrbitDBHeliaInstance
  log: LogInstance<T>
  onSynced?: (head: Uint8Array) => Promise<void>
  start?: boolean
  timeout?: number
}

export interface SyncInstance<T, E extends SyncEvents<T>> extends Startable {
  add: (entry: EntryInstance<T>) => Promise<void>
  events: TypedEventEmitter<E>

  peers: PeerSet
}

export class Sync<T, E extends SyncEvents<T> = SyncEvents<T>> implements SyncInstance<T, E> {
  public events: TypedEventEmitter<E>
  public peers: PeerSet
  private address: string
  private headsSyncAddress: string
  private ipfs: OrbitDBHeliaInstance
  private log: LogInstance<T>
  private onSynced?: (bytes: Uint8Array) => Promise<void>
  private queue: PQueue

  private started: boolean
  private timeout: number

  private constructor(options: SyncOptions<T>) {
    this.ipfs = options.ipfs
    this.log = options.log
    this.onSynced = options.onSynced
    this.timeout = options.timeout || SYNC_TIMEOUT
    this.events = options.events || new TypedEventEmitter<E>()
    this.peers = new PeerSet()
    this.queue = new PQueue({ concurrency: 1 })
    this.started = false
    this.address = this.log.id
    this.headsSyncAddress = join(
      SYNC_PROTOCOL,
      this.address,
    )
  }

  static async create<T, E extends SyncEvents<T>>(options: SyncOptions<T>): Promise<SyncInstance<T, E>> {
    const sync = new Sync(options)
    if (options.start !== false) {
      await sync.start()
        .catch((error) => {
          return sync.events.dispatchEvent(new ErrorEvent('error', { error }))
        })
    }

    return sync
  }

  public async add(entry: EntryInstance<T>): Promise<void> {
    const {
      address,
      ipfs,
      started,
    } = this

    const {
      bytes,
    } = entry
    if (started && bytes) {
      await ipfs.libp2p.services.pubsub.publish(
        address,
        bytes,
      )
    }
  }

  public async start(): Promise<void> {
    if (!this.started) {
      await this.ipfs.libp2p.handle(
        this.headsSyncAddress,
        this.handleReceiveHeads,
      )

      this.ipfs.libp2p.services.pubsub.addEventListener(
        'subscription-change',
        this.handlePeerSubscribed,
      )
      this.ipfs.libp2p.services.pubsub.addEventListener(
        'message',
        this.handleUpdateMessage,
      )

      await Promise.resolve(
        this.ipfs.libp2p.services.pubsub.subscribe(
          this.address,
        ),
      )

      this.started = true
    }
  }

  public async stop(): Promise<void> {
    if (this.started) {
      await this.queue.onIdle()

      await this.ipfs.libp2p.unhandle(
        this.headsSyncAddress,
      )

      this.ipfs.libp2p.services.pubsub.removeEventListener(
        'subscription-change',
        this.handlePeerSubscribed,
      )
      this.ipfs.libp2p.services.pubsub.removeEventListener(
        'message',
        this.handleUpdateMessage,
      )

      await Promise.resolve(
        this.ipfs.libp2p.services.pubsub.unsubscribe(
          this.address,
        ),
      )

      this.peers.clear()
      this.started = false
    }
  }

  private handlePeerSubscribed: EventHandler<
    CustomEvent<SubscriptionChangeData>
  > = async (event) => {
      const task = async () => {
        const {
          peerId,
          subscriptions,
        } = event.detail
        const subscription = subscriptions.find(
          (e) => {
            return e.topic === this.address
          },
        )
        if (!subscription) {
          return
        }

        if (subscription.subscribe) {
          if (this.peers.has(peerId)) {
            return
          }

          const timeoutController = new TimeoutController(this.timeout)
          try {
            this.peers.add(peerId)
            const stream = await this.ipfs.libp2p.dialProtocol(
              peerId,
              this.headsSyncAddress,
              timeoutController,
            )
            pipe(
              this.sendHeads(),
              stream,
              this.receiveHeads(peerId),
            )
          }
          catch (error) {
            this.peers.delete(peerId)
            const { code } = error as { code: string }
            if (code !== 'ERR_UNSUPPORTED_PROTOCOL') {
              this.events.dispatchEvent(
                new ErrorEvent(
                  'error',
                  {
                    error,
                  },
                ),
              )
            }
          }
          finally {
            timeoutController.clear()
          }
        }
        else {
          this.peers.delete(peerId)
          this.events.dispatchEvent(
            new CustomEvent(
              'leave',
              {
                detail: {
                  peerId,
                },
              },
            ),
          )
        }
      }

      await this.queue.add(task)
    }

  private handleReceiveHeads: StreamHandler = async ({
    connection,
    stream,
  }) => {
    const peerId = connection.remotePeer
    try {
      this.peers.add(peerId)
      await pipe(
        stream,
        this.receiveHeads(peerId),
        this.sendHeads(),
        stream,
      )
    }
    catch (error) {
      this.peers.delete(peerId)
      this.events.dispatchEvent(
        new ErrorEvent(
          'error',
          {
            error,
          },
        ),
      )
    }
  }

  private handleUpdateMessage: EventHandler<CustomEvent<Message>> = async (
    message,
  ) => {
    const {
      data,
      from,
      topic,
    } = message.detail as SignedMessage

    const task = async () => {
      try {
        if (from && data && this.onSynced) {
          await this.onSynced(data)
        }
      }
      catch (error) {
        this.events.dispatchEvent(
          new ErrorEvent(
            'error',
            {
              error,
            },
          ),
        )
      }
    }

    if (topic === this.address) {
      await this.queue.add(task)
    }
  }

  private async *headsIterator(): AsyncGenerator<Uint8Array> {
    const heads = await this.log.heads()
    for await (const { bytes } of heads) {
      yield bytes!
    }
  }

  private async onPeerJoined(peerId: PeerId): Promise<void> {
    const heads = await this.log.heads()
    this.events.dispatchEvent(
      new CustomEvent(
        'join',
        {
          detail: {
            heads,
            peerId,
          },
        },
      ),
    )
  }

  private receiveHeads(
    peerId: PeerId,
  ): Sink<AsyncIterable<Uint8ArrayList>, void> {
    return async (source) => {
      for await (const value of source) {
        const headBytes = value.subarray()
        if (headBytes && this.onSynced) {
          await this.onSynced(headBytes)
        }
      }
      if (this.started) {
        await this.onPeerJoined(peerId)
      }
    }
  }

  private sendHeads(): () => Source<Uint8Array> {
    return () => {
      return this.headsIterator()
    }
  }
}
