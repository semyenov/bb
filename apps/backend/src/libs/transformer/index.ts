import { decode, encode } from '@msgpack/msgpack'

import type { DataTransformerOptions } from './vendor.d'

export function uint8ArrayToString(arr: Uint8Array) {
  return Array.from(arr)
    .map((byte) => {
      return String.fromCharCode(byte)
    })
    .join('')
}

export function stringToUint8Array(str: string) {
  return new Uint8Array(Array.from(str)
    .map((char) => {
      return char.charCodeAt(0)
    }))
}

export const transformer: DataTransformerOptions = {
  input: {
    deserialize: (obj: string) => {
      return decode(stringToUint8Array(obj))
    },
    serialize: (obj: unknown) => {
      return uint8ArrayToString(encode(obj))
    },
  },
  output: {
    deserialize: (obj: string) => {
      return decode(stringToUint8Array(obj))
    },
    serialize: (obj: unknown) => {
      return uint8ArrayToString(encode(obj))
    },
  },
}
