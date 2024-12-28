# Regioni

A TypeScript-based distributed application framework built on OrbitDB.

## 📁 Project Structure

The monorepo is organized into:

### 📱 Apps

- `backend`: Core server application with TypeScript configuration and user management
- Contains modules for configuration management, logging, and JWT handling

### 🔧 Packages

- `orbit`: Core OrbitDB functionality including:
  - Document and event database implementations
  - Identity management and key storage
  - Clock-based synchronization
  - Memory storage implementation
- `eslint-config`: Shared ESLint configuration and coding standards

## 🛠️ Development

### Prerequisites

- Node.js
- TypeScript
- OrbitDB

### Getting Started

1. Clone the repository
2. Install dependencies with your package manager of choice
3. Build the packages
4. Start development

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Open a Pull Request

Follow the TypeScript coding standards defined in `eslint-config`.

## 📝 License

MIT License - see LICENSE file for details.
