# Regioni Monorepo

This monorepo contains various libraries, packages, and applications for the Regioni project.

## Project Structure

The project is organized into three main categories:

- `apps/`: Application projects
- `libs/`: Library projects
- `packages/`: Shared packages

### Apps

- `backend`: Backend application
- `orbit`: Orbit-related application

### Libraries

- `ajv`: JSON Schema validator
- `bullmq`: Bull queue for Redis
- `jose`: JavaScript Object Signing and Encryption
- `logger`: Logging utility
- `mongodb`: MongoDB integration
- `orbit`: OrbitDB-related functionality
- `pointers`: Pointer-related utilities
- `quicktype`: Code generation from JSON schemas
- `redis`: Redis integration
- `superjson`: Serialization library
- `transformer`: Data transformation utilities
- `ws`: WebSocket functionality

### Packages

- `eslint-config`: Shared ESLint configuration
- `foo`: Example package
- `orbitdb`: OrbitDB type definitions

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Build the projects:
   ```
   yarn build
   ```
