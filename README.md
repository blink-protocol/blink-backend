# Blink Backend

Read-only resolver API for Blink aliases stored in the Soroban LinkRegistry contract.

## API

```text
GET /health
GET /v1/links/:alias
```

The service validates aliases, simulates the public `resolve` contract call through Stellar RPC, and returns a JSON-safe representation of the link record.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Checks

```bash
npm test
npm run build
```

## Boundaries

Transaction creation and wallet authorization remain in the frontend. The backend provides caching, rate-limiting, observability, and a stable read API boundary for future clients.

