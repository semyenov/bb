import type { Buffer } from 'node:buffer'

import type { IJoseVerify } from '@/libs/jose'

import { sign, verify } from '@/libs/jose'
import { createLogger } from '@/libs/logger'

import type { WebSocketProxy } from './ws'

type BufferLike =
  | { [Symbol.toPrimitive]: (hint: string) => string }
  | { valueOf: () => ArrayBuffer }
  | { valueOf: () => readonly number[] }
  | { valueOf: () => SharedArrayBuffer }
  | { valueOf: () => string }
  | { valueOf: () => Uint8Array }
  | ArrayBuffer
  | ArrayBufferView
  | Buffer
  | DataView
  | number
  | readonly any[]
  | readonly number[]
  | SharedArrayBuffer
  | string
  | Uint8Array

const logger = createLogger({
  defaultMeta: {
    module: 'ws',
  },
})

export function wrapSocket<T>(ws: WebSocketProxy, jose?: IJoseVerify) {
  ws.jose = jose

  return new Proxy(ws, {
    get: (target, prop, receiver) => {
      switch (prop) {
        case 'on':
          return customOn.bind(target)
        case 'send':
          return customSend.bind(target)
      }

      return Reflect.get(target, prop, receiver)
    },
  }) as T
}

function customOn(
  this: WebSocketProxy,
  event: string,
  listener: (...args: any[]) => void,
) {
  return this.on(event, customListener)

  async function customListener(this: WebSocketProxy, ...args: any[]) {
    if (event === 'message') {
      const [data, isBinary] = args as [BufferLike, boolean]

      if (!this.jose) {
        logger.debug('Receiving: jose not initialized', data)

        return listener.call(this, data, isBinary)
      }
      try {
        const { payload } = await verify(data.toString(), this.jose.jwks)

        logger.debug('Receiving payload"', { payload })

        return listener.call(
          this,
          // JSON.stringify({ ...jws, ...(payload as object) }),
          JSON.stringify(payload),
          isBinary,
        )
      }
      catch {
        return listener.call(
          this,
          // JSON.stringify({ ...jws, ...(payload as object) }),
          JSON.stringify({}),
          isBinary,
        )
      }
    }

    logger.debug('Receiving', event, args)

    listener.call(this, ...args)
  }
}

async function customSend(
  this: WebSocketProxy,
  data: BufferLike,
  cb?: (error?: Error) => void,
) {
  if (!this.jose) {
    logger.debug('Sending: jose not initialized', data)

    return this.send(data, cb)
  }

  logger.debug('Signing payload: ', { jose: this.jose, payload: data })

  const jws = await sign(this.jose.keyPair.privateKey, {
    payload: JSON.parse(data.toString()),
  })

  logger.debug('Sending', jws)

  this.send(jws, cb)
}
