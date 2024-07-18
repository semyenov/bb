import * as dagCbor from '@ipld/dag-cbor'
import { createLogger } from '@regioni/lib-logger'
import { CID } from 'multiformats'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'

// Create logger
const logger = createLogger({
  defaultMeta: {
    label: 'dag-cbor',
  },
})

async function createLinkedData() {
  // Create first object
  const person = {
    name: 'Alice',
    age: 30,
  }

  // Encode and create block for first object
  const personBlock = await Block.encode({
    value: person,
    codec: dagCbor,
    hasher: sha256,
  })

  const personCid = personBlock.cid

  // Create second object that references the first
  const post = {
    title: 'My first post',
    content: 'Hello, world!',
    author: personCid, // Reference to first object through CID
  }

  // Encode and create block for second object
  const postBlock = await Block.encode({
    value: post,
    codec: dagCbor,
    hasher: sha256,
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

createLinkedData().catch((error) => logger.error('Error:', error))
