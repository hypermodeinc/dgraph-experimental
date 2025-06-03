# Contributing to CSV to Knowledge Graph

Thanks for your interest in contributing to CSV to Knowledge Graph! This project allows you to transform CSV files into interactive knowledge graphs powered by Dgraph - all from your browser, in just a few clicks.

## Project Structure

This project is a monorepo containing both applications and shared packages:

### Applications

- **Frontend** (`/frontend`) - Next.js React application providing the user interface
- **Modus Backend** (`/modus`) - Go-based backend using Hypermode for AI-powered graph generation

### Packages

- **csv-to-rdf** (`/packages/csv-to-rdf`) - Converts CSV data to RDF format
- **rdf-to-dgraph** (`/packages/rdf-to-dgraph`) - Uploads RDF data to Dgraph using HTTP for browser compatibility
- **virtual-graph** (`/packages/virtual-graph`) - Provides a virtual graph interface for the UI
- **utils** (`/packages/utils`) - Shared utility functions and types, including debugging tools

Each package is designed to be used independently or as part of the full application stack.

## Development Setup

### Prerequisites

This project uses [PNPM](https://pnpm.io/) to manage the monorepo. First, install PNPM globally:

```sh
npm install -g pnpm@10.6.0
```

Then install the project dependencies:

```sh
pnpm install
```

### Frontend Development

To start the Next.js frontend server:

```sh
pnpm dev:frontend
```

This will run the dev server on `http://localhost:3000`. You should see output similar to:

```sh
▲ Next.js 15.3.0
   - Local:        http://localhost:3000
   - Network:      http://192.168.245.245:3000
   - Environments: .env
   - Experiments (use with caution):
     ✓ webpackBuildWorker
     ✓ parallelServerCompiles
     ✓ parallelServerBuildTraces

 ✓ Starting...
 ✓ Ready in 1577ms
```

### Backend Development

For the Modus backend, you'll need to install the Hypermode CLI and have Go set up:

```sh
npm install -g @hypermode/modus-cli
```

Start the Modus backend:

```sh
pnpm dev:backend
```

This will run the Modus server on `http://localhost:8686/graphql`. The output should look like:

```sh
▗▖  ▗▖ ▗▄▖ ▗▄▄▄ ▗▖ ▗▖ ▗▄▄▖
▐▛▚▞▜▌▐▌ ▐▌▐▌  █▐▌ ▐▌▐▌
▐▌  ▐▌▐▌ ▐▌▐▌  █▐▌ ▐▌ ▝▀▚▖
▐▌  ▐▌▝▚▄▞▘▐▙▄▄▀▝▚▄▞▘▗▄▄▞▘

Build succeeded! 🎉

Your local endpoint is ready!
• GraphQL (default): http://localhost:8686/graphql
```

### Running Dgraph Locally

If you want to run a local instance of Dgraph for development or testing, you can use the Docker Compose file provided in the repository:

```sh
# Start Dgraph containers
docker-compose up -d

# Check that containers are running
docker-compose ps
```

This will start Dgraph Zero and Alpha nodes with appropriate ports exposed:

- Dgraph Alpha HTTP: 8080
- Dgraph Alpha GRPC: 9080
- Dgraph Zero: 5080

You can access the Dgraph UI through the Alpha HTTP port.

## Testing

Sample CSV files for testing are available in the `/csv` directory.

You can run tests across all packages with:

```sh
pnpm test
```

Individual package tests can be run by navigating to the package directory and running the test command:

```sh
cd packages/csv-to-rdf
pnpm test
```

Thank you for your contributions!
