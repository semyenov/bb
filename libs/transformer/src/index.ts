import { decode, encode } from '@msgpack/msgpack'

import type { DataTransformerOptions } from '@trpc/server'

export function uint8ArrayToString(arr: Uint8Array) {
  return Array.from(arr)
    .map((byte) => String.fromCharCode(byte))
    .join('')
}

export function stringToUint8Array(str: string) {
  return new Uint8Array(Array.from(str).map((char) => char.charCodeAt(0)))
}

export const transformer: DataTransformerOptions = {
  input: {
    serialize: (obj: unknown) => uint8ArrayToString(encode(obj)),
    deserialize: (obj: string) => decode(stringToUint8Array(obj)),
  },
  output: {
    serialize: (obj: unknown) => uint8ArrayToString(encode(obj)),
    deserialize: (obj: string) => decode(stringToUint8Array(obj)),
  },
}
