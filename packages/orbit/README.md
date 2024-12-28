# @regioni/orbit

TypeScript implementation of OrbitDB core functionality with strong typing and modern async patterns.

## Features

- **Identity Management**: Secure identity creation and verification
- **Key Storage**: Flexible key management with pluggable storage backends
- **Database Types**: Support for document and event database patterns
- **Clock Synchronization**: Reliable distributed state management
- **Memory Storage**: In-memory storage implementation included

## Core Components

### Identity System

```typescript
interface IdentityInstance {
  id: string
  publicKey: string
  sign: (data: string | Uint8Array) => Promise<string>
  verify: (signature: string, publicKey: string, data: string) => Promise<boolean>
}
```

### Key Storage

```typescript
interface KeyStoreInstance {
  addKey: (id: string, key: Secp256k1PrivateKey) => Promise<void>
  getKey: (id: string) => Promise<null | Secp256k1PrivateKey>
  createKey: (id: string) => Promise<Secp256k1PrivateKey>
}
```

## Usage

```typescript
import { OrbitDB } from '@regioni/orbit'

const orbitdb = await OrbitDB.createInstance({
  ipfs: ipfsNode,
  directory: './orbitdb'
})

// Create/open databases
const db = await orbitdb.open('my-db', {
  // Database options
})
```

## Installation

```bash
npm install @regioni/orbit
# or
yarn add @regioni/orbit
```

## Contributing

See the main repository's README for contribution guidelines.

## License

MIT License - see LICENSE file for details.
