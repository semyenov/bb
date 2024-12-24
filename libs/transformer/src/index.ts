import type { DataTransformerOptions } from './vendor.d'

import { decode, encode } from '@msgpack/msgpack'

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
    serialize: (obj: unknown) => {
      return uint8ArrayToString(encode(obj))
    },
    deserialize: (obj: string) => {
      return decode(stringToUint8Array(obj))
    },
  },
  output: {
    serialize: (obj: unknown) => {
      return uint8ArrayToString(encode(obj))
    },
    deserialize: (obj: string) => {
      return decode(stringToUint8Array(obj))
    },
  },
}
