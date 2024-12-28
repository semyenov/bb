import process from 'node:process'

export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder()
    .encode(str)
}

export function uint8ArrayToString(uint8Array: Uint8Array): string {
  return new TextDecoder()
    .decode(uint8Array)
}

export function isBrowser() {
  return typeof window !== 'undefined'
}

export function isNode() {
  return typeof process !== 'undefined'
}
