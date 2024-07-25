import * as dagCbor from '@ipld/dag-cbor'

import { RPCMessage } from './pb'

export function encode(obj: any) {
  return dagCbor.encode(obj)
}

export function decode(buf: Uint8Array) {
  return dagCbor.decode(buf)
}

export function createRequest(name: string, id: number, params?: Uint8Array) {
  return RPCMessage.encode({
    request: {
      name,
      id,
      params,
    },
  })
}

export function createNotification(name: string, params?: Uint8Array) {
  return RPCMessage.encode({
    request: {
      name,
      params,
    },
  })
}

export function createResponse(id: number, result?: Uint8Array) {
  return RPCMessage.encode({
    response: {
      id,
      result,
    },
  })
}

export function createError(id: number, message: string, code?: number, data?: Uint8Array) {
  return RPCMessage.encode({
    response: {
      id,
      error: {
        code: code ?? 0,
        message,
        data,
      },
    },
  })
}

export function createMethodNotFoundError(id: number) {
  return createError(id, 'Method not found', -32601)
}
