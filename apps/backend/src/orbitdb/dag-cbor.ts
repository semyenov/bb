import * as dagCbor from '@ipld/dag-cbor'
import { CID } from 'multiformats'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'

import { createLogger } from '@/libs/logger'

// Create logger
const logger = createLogger({
  defaultMeta: {
    label: 'dag-cbor',
  },
})

async function createLinkedData() {
  // Create first object
  const person = {
    age: 30,
    name: 'Alice',
  }

  // Encode and create block for first object
  const personBlock = await Block.encode({
    codec: dagCbor,
    hasher: sha256,
    value: person,
  })

  const personCid = personBlock.cid

  // Create second object that references the first
  const post = {
    author: personCid, // Reference to first object through CID
    content: 'Hello, world!',
    title: 'My first post',
  }

  // Encode and create block for second object
  const postBlock = await Block.encode({
    codec: dagCbor,
    hasher: sha256,
    value: post,
  })
  const postCid = postBlock.cid

  logger.info('Linked DAG-CBOR object created', {
    personCid: CID.asCID(personCid),
    postCid: CID.asCID(postCid),
  })

  // Decode and log data
  const decodedPost = await Block.decode({
    bytes: postBlock.bytes,
    codec: dagCbor,
    hasher: sha256,
  })

  logger.info('Decoded post', { decodedPost: decodedPost.value })

  for await (const [key, node] of decodedPost.links()) {
    logger.info(`Link ${key}`, { node })
  }

  return { personBlock, postBlock }
}

createLinkedData()
  .catch((error) => {
    return logger.error('Error:', error)
  })
