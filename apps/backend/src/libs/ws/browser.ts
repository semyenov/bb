import WebSocket, { type MessageEvent } from 'ws'

import type { IJoseVerify } from '@/libs/jose'

import { sign, verify } from '@/libs/jose'
import { createLogger } from '@/libs/logger'

type BufferLike = ArrayBufferLike | ArrayBufferView | string

const logger = createLogger({
  defaultMeta: {
    namespace: 'ws/browser',
  },
})

export class WebSocketBrowserProxy extends WebSocket {
  jose?: IJoseVerify

  public constructor(
    address: string | URL,
    protocols?: string | string[],
    jose?: IJoseVerify,
  ) {
    super(address, protocols)
    this.jose = jose

    return wrapSocket(this)
  }
}

export function wrapSocket(ws: WebSocketBrowserProxy) {
  return new Proxy(ws, {
    get: (target, prop) => {
      logger.debug('Getting', prop, target)
      if (prop === 'addEventListener') {
        return customOn.bind(target)
      }
      if (prop === 'send') {
        return customSend.bind(target)
      }

      return Reflect.get(target, prop)
    },
  })
}

function customOn(
  this: WebSocketBrowserProxy,
  event: keyof WebSocket.WebSocketEventMap,
  listener: (...args: any[]) => void,
) {
  this.addEventListener(
    event,
    async function customListener(this: WebSocketBrowserProxy, ...args: any[]) {
      if (event === 'message') {
        const [event] = args as [MessageEvent]
        const { data } = event

        if (!this.jose) {
          logger.debug('Receiving: jose not initialized', data)

          return listener.call(this, event)
        }

        try {
          const { payload } = await verify(data.toString(), this.jose.jwks)
          const newEvent = createMessageEvent(event, payload)
          logger.debug('Receiving payload', { event: newEvent, payload })

          return listener.call(this, newEvent)
        }
        catch {
          const newEvent = createMessageEvent(event, {})

          return listener.call(this, newEvent)
        }
      }

      logger.debug('Receiving', event, args)

      return listener.call(this, ...args)
    },
  )
}

function createMessageEvent(
  event: MessageEvent,
  payload: unknown,
): MessageEvent {
  return {
    data: JSON.stringify(payload),
    target: event.target,
    type: 'message',
  } satisfies MessageEvent
}

async function customSend(this: WebSocketBrowserProxy, data: BufferLike) {
  if (!this.jose) {
    logger.debug('Sending: jose not initialized', data)
    this.send(data)

    return
  }

  logger.debug('Signing payload: ', { jose: this.jose, payload: data })

  const jws = await sign(this.jose.keyPair.privateKey, {
    payload: JSON.parse(data.toString()),
  })

  logger.debug('Sending', jws)

  this.send(jws)
}
