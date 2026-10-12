# Blink Backend

Read-focused **resolver API** for Blink aliases stored in the Soroban **LinkRegistry** contract.

The service validates aliases, simulates the public `resolve` call through Stellar RPC, enforces http(s) destination safety, and returns a stable JSON contract for frontends and integrators.

| | |
| --- | --- |
| **Stack** | Node.js, Express 5, TypeScript, Zod, Helmet, Stellar SDK |
| **Networks** | `testnet` · `public` |
| **Related** | [blink-frontend](https://github.com/blink-protocol/blink-frontend) · [blink-contracts](https://github.com/blink-protocol/blink-contracts) |
| **Live** | [blink-backend-chi.vercel.app](https://blink-backend-chi.vercel.app) |

---

## Boundaries

| In scope | Out of scope |
| --- | --- |
| Public resolve + health | Building or signing create/update/deactivate txs |
| Alias validation | Custodial wallets |
| Destination safety gate | Full indexer / projection DB (future) |
| RPC simulation for `resolve` | Mutating on-chain state |

Wallet authorization and transaction construction stay in the **frontend** (or other clients). This API is the stable **read** edge.

---

## Architecture

```text
Client
  └─ GET /v1/links/:alias
        ├─ normalize + validate alias
        ├─ LinkRegistry.resolve (Soroban simulate)
        ├─ active? → else 404
        ├─ http(s) destination? → else 422
        └─ JSON link record

GET /health → liveness JSON
```

| Module | Role |
| --- | --- |
| `src/server.ts` | Boot, wire config + registry, listen (non-Vercel) |
| `src/app.ts` | HTTP routes, Helmet, CORS, error mapping |
| `src/config.ts` | Zod-validated environment |
| `src/registry.ts` | Network passphrase + Soroban `resolve` |
| `src/destination-safety.ts` | http(s) allowlist for returned destinations |
| `test/app.test.ts` | Deterministic HTTP tests (fake registry) |

---

## Prerequisites

- Node.js **20+**
- npm 10+
- Reachable Soroban RPC for the configured network
- Deployed LinkRegistry `CONTRACT_ID`

---

## Quick start

```bash
git clone https://github.com/blink-protocol/blink-backend.git
cd blink-backend
npm install
cp .env.example .env
# set CONTRACT_ID (required) and adjust network/RPC/origin
npm run dev
```

Health check:

```bash
curl -s http://127.0.0.1:4000/health
# {"status":"ok"}
```

---

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | no | `4000` | Listen port (local / non-serverless) |
| `STELLAR_RPC_URL` | no | Soroban testnet RPC | RPC HTTP URL |
| `STELLAR_NETWORK` | no | `testnet` | `testnet` \| `public` — selects passphrase |
| `CONTRACT_ID` | **yes** | — | LinkRegistry id (`C…`) |
| `ALLOWED_ORIGIN` | no | `http://localhost:3000` | CORS allowlist origin |

`STELLAR_NETWORK` must match the RPC and the contract deployment. Mismatches produce confusing simulation failures.

---

## HTTP API

Base URL examples:

- Local: `http://127.0.0.1:4000`
- Production: your deployed HTTPS origin

### `GET /health`

Liveness probe. Does not check RPC.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"ok"}
```

### `GET /v1/links/:alias`

Resolve an active alias.

**Alias rules** (aligned with contract + frontend): `^[a-z0-9-]{3,32}$` (input is lowercased).

#### Success — `200`

```json
{
  "alias": "stellar",
  "owner": "G...",
  "destination": "https://example.com/path",
  "active": true,
  "createdAt": "1710000000",
  "updatedAt": "1710000000"
}
```

Timestamps are decimal strings (Soroban `u64` / bigint-safe).

#### Errors

| Status | `error` code | When |
| --- | --- | --- |
| `400` | `invalid_alias` | Alias fails grammar (checked before RPC) |
| `404` | `link_not_found` | Missing or inactive link |
| `422` | `unsafe_destination` | Active record but destination is not http(s) |
| `502` | `stellar_rpc_error` | RPC / simulation failure |

Error body shape:

```json
{ "error": "<code>" }
```

Unsafe destinations are **never** returned in the JSON body.

#### Example

```bash
curl -s "http://127.0.0.1:4000/v1/links/stellar" | jq .
```

---

## Security

- **Helmet** enabled; `X-Powered-By` disabled.
- **CORS** restricted to `ALLOWED_ORIGIN`.
- **Destination allowlist** — only `http:` / `https:` URLs leave the API.
- **No secrets in responses** — do not log full hostile destinations or transaction XDR at info level in future hardening.
- **Network passphrase** — derived from `STELLAR_NETWORK` via `passphraseForNetwork()` (not hardcoded solely to testnet).

Rate limiting, response caching, and RPC timeouts are tracked as Wave issues; enable them before high public traffic.

---

## Scripts

```bash
npm run dev      # tsx watch
npm test         # node:test + tsx
npm run build    # tsc → dist/
npm start        # node dist/server.js
```

Tests use an injected fake registry — **no live RPC required**.

```bash
npm test
```

---

## Deployment

### Node host

```bash
npm run build
npm start
```

Set env vars in the process supervisor. Put TLS termination in the reverse proxy.

### Vercel / serverless

`vercel.json` may export the Express app. Ensure:

- `CONTRACT_ID`, `STELLAR_NETWORK`, `STELLAR_RPC_URL`, `ALLOWED_ORIGIN` are set in the project
- Cold starts + RPC latency are acceptable for redirect SLAs
- Frontend `ALLOWED_ORIGIN` matches the real web origin

---

## Integration notes (frontend)

Prefer:

```text
Browser /{alias}  →  Backend GET /v1/links/:alias  →  307 to destination
```

over calling Soroban simulate from the Next.js route on every click. That keeps cache, rate limits, and error taxonomy in one place.

---

## Contributing

1. Assignment required for Wave issues.
2. Branch from `main`; keep PRs focused.
3. Add/adjust tests in `test/` for HTTP contract changes.
4. PR body should include `Closes #<n>` when applicable.

Issues: [github.com/blink-protocol/blink-backend/issues](https://github.com/blink-protocol/blink-backend/issues)

---

## Status

Production-oriented read API for the current MVP. On-chain writes, indexing, and analytics live elsewhere or are planned. Treat mainnet exposure as **best-effort** until rate limits, caching, and RPC budgets are enabled and the contract is audited.
