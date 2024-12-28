import type { IJoseVerify } from '@regioni/lib-jose'
import type { ServerOptions, WebSocket } from 'ws'

import { createLogger } from '@regioni/lib-logger'
import { WebSocketServer } from 'ws'

import { wrapSocket } from './wrapper'

const logger = createLogger({
  defaultMeta: {
    module: 'wss',
  },
})

export class WebSocketServerProxy extends WebSocketServer {
  jose?: IJoseVerify
  public constructor(
    options?: ServerOptions,
    jose?: IJoseVerify,
    callback?: () => void,
  ) {
    super(options, callback)
    this.jose = jose
    logger.info('new WebSocketServer', jose)

    return wrapSocketServer(this)
  }
}

export function wrapSocketServer(wss: WebSocketServer) {
  return new Proxy(wss, {
    get: (target, prop, receiver) => {
      if (prop === 'on') {
        return customOn.bind(target)
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}

function customOn(
  this: WebSocketServer,
  event: string,
  listener: (...args: any[]) => void,
) {
  this.on(event, (...args: any[]) => {
    if (event === 'connection') {
      logger.info('Connection')
      args[0] = wrapSocket(args[0] as WebSocket, this.jose)
    }

    listener.call(this, ...args)
  })
}
