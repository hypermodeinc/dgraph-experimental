# Simple MCP Client Demo

This is a simple web client demo for connecting to different Model Context Protocol (MCP) SSE servers. The demo allows you to:

1. Connect to different MCP servers:
   - Knowledge Graph Memory Server (KGMS)
   - Dgraph MCP Server
   - Any custom MCP server

2. Dynamically discover available tools on each server
3. Call any available tool with parameters

## Setup

To set up the project, run:

```bash
npm install
```

## Building the Client

To build the client:

```bash
npm run build
```

## Running the Client

To serve the client on port 8082:

```bash
npm run serve
```

Then open http://localhost:8082 in your browser.

## Server Configurations

The client is pre-configured with the following server URLs:

- KGMS Server: http://localhost:9191
- Dgraph MCP Server: http://localhost:8888/mcp

You can also specify a custom server URL if needed.

## Usage

1. Select a server type or enter a custom URL
2. Click "Connect" to connect to the server
3. Once connected, select a tool from the dropdown
4. Enter any required parameters
5. Click "Call Tool" to execute the tool
6. View the results in the Results panel
