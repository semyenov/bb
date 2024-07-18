import type { IJoseVerify } from '@regioni/lib-jose'

declare module 'ws' {
  export interface WebSocketServer {
    jose?: IJoseVerify
  }
  export interface WebSocket {
    jose?: IJoseVerify
  }
}

declare global {
  export interface WebSocket {
    jose?: IJoseVerify
  }
}
