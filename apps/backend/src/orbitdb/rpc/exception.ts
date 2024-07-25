// import type { RPCError } from './message-handler'
export interface RPCError {
  code: number
  message: string
  data?: Uint8Array
}

export class RPCException extends Error implements RPCError {
  public code = 0
  public data?: Uint8Array

  constructor(message: string, code: number, data?: any) {
    super(message)

    this.code = code
    this.data = data
  }
}
