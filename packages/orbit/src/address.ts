import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'

import { join } from './utils'

export interface OrbitDBAddressInstance {
  address: string
  hash: string
  protocol: string
  toString: () => string
}

export class OrbitDBAddress implements OrbitDBAddressInstance {
  readonly address: string
  readonly hash: string
  readonly protocol: string = 'orbitdb'

  private constructor(address: string) {
    this.address = address
    this.hash = address
      .replace('/orbitdb/', '')
      .replace('\\orbitdb\\', '')
  }

  static create(
    address: OrbitDBAddressInstance | string,
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
