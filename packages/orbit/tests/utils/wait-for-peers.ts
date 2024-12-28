'use strict'

import type { PeerId } from '@libp2p/interface'
import type { OrbitDBHeliaInstance } from '@regioni/orbit'
import { createLogger } from '@regioni/lib-logger'

const logger = createLogger({
  defaultMeta: {
    service: 'orbit',
    label: 'wait-for-peers',
    version: '0.0.1',
  },
})

function waitForPeers(ipfs: OrbitDBHeliaInstance, peersToWait: PeerId[]) {
  return new Promise((
    resolve,
    reject,
  ) => {
    const interval = setInterval(async () => {
      try {
        const peers = await ipfs.libp2p.services.pubsub.getPeers()
        const peerIds = peers.map((peer) => {
          return peer.toString()
        })
        const peerIdsToWait = peersToWait.map((peer) => {
          return peer.toString()
        })

        const hasAllPeers = peerIdsToWait
          .map((e) => {
            return peerIds.includes(e)
          })
          .filter(Boolean)
          .length === 0

        // FIXME: Does not fail on timeout, not easily fixable
        if (hasAllPeers) {
          logger.info('Found peers!')
          clearInterval(interval)
          resolve(true)
        }
      }
      catch (error) {
        clearInterval(interval)
        reject(error)
      }
    }, 200)
  })
}

export default waitForPeers
