import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'

import { join } from './utils'

export interface OrbitDBAddressInstance {
  protocol: string
  hash: string
  address: string
  toString: () => string
}

export class OrbitDBAddress implements OrbitDBAddressInstance {
  readonly protocol: string = 'orbitdb'
  readonly hash: string
  readonly address: string

  private constructor(address: string) {
    this.address = address
    this.hash = address
      .replace('/orbitdb/', '')
      .replace('\\orbitdb\\', '')
  }

  static create(
    address: string | OrbitDBAddressInstance,
  ): OrbitDBAddressInstance {
    if (typeof address !== 'string') {
      return address
    }

    return new OrbitDBAddress(address)
  }

  static isValid(address: string): boolean {
    if (
      !address.startsWith(`\/orbitdb`)
      && !address.startsWith(`orbitdb`)
    ) {
      return false
    }

    let localAddress = address.replaceAll(
      `/orbitdb/`,
      '',
    )
    localAddress = localAddress.replaceAll(
      `\\orbitdb\\`,
      '',
    )
    localAddress = localAddress.replaceAll(
      `/`,
      '',
    )
    localAddress = localAddress.replaceAll(
      `\\`,
      '',
    )

    try {
      const cid = CID.parse(
        localAddress,
        base58btc,
      )

      return Boolean(cid)
    }
    catch {
      return false
    }
  }

  static parseAddress(address: string): OrbitDBAddressInstance {
    if (!address) {
      throw new Error(`Not a valid OrbitDB address: ${address}`)
    }

    if (!OrbitDBAddress.isValid(address)) {
      throw new Error(`Not a valid OrbitDB address: ${address}`)
    }

    return OrbitDBAddress.create(address)
  }

  toString(): string {
    return join('/', this.protocol, this.hash)
  }
}
