import type { Entry } from './log'
import type { TypedEventEmitter } from '@libp2p/interface'

interface SyncEvents<T> extends TypedEventEmitter {
  on: ((
    event: 'join',
    listener: (peerId: string, heads: Entry.Instance<T>[]) => void,
  ) => this) &
  ((event: 'leave', listener: (peerId: string) => void) => this) &
  ((event: 'error', listener: (error: Error) => void) => this)
}

interface DatabaseEvents<T = unknown> extends TypedEventEmitter {
  on: ((
    event: 'join',
    listener: (peerId: string, heads: Entry.Instance<T>[]) => void,
  ) => this) &
  ((event: 'leave', listener: (peerId: string) => void) => this) &
  ((event: 'close', listener: () => void) => this) &
  ((event: 'drop', listener: () => void) => this) &
  ((event: 'error', listener: (error: Error) => void) => this) &
  ((event: 'update', listener: (entry: Entry.Instance<T>) => void) => this)
}

export type { DatabaseEvents, SyncEvents }
