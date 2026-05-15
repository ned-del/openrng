# OpenRNG API Reference

**Base URL:** `https://api.openrng.io`

**Authentication:** Include `x-api-key` header on protected endpoints.

---

## Endpoints

### GET /v1/health

System health check. No authentication required.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-05-15T06:11:20.099Z",
  "uptime": 182.15,
  "pool": {
    "clients": 4,
    "totalAnchors": 11,
    "p99LatencyMs": 2
  },
  "blockchain": "polygon-amoy-testnet"
}
```

| Field | Description |
|---|---|
| `status` | `ok` or `degraded` |
| `uptime` | Server uptime in seconds |
| `pool.clients` | Number of registered clients |
| `pool.totalAnchors` | Total Merkle roots anchored on Polygon |
| `pool.p99LatencyMs` | 99th percentile token serving latency |

---

### POST /v1/tokens/request

Request verified random tokens. Each token includes a Merkle proof path for independent verification.

**Auth:** Required (`x-api-key`)

**Request:**

```json
{
  "client_id": "my-agent-001",
  "quantity": 5,
  "range": { "min": 1, "max": 100 },
  "vertical": "agent",
  "idempotency_key": "unique-request-id"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your unique client identifier (auto-registers if new) |
| `quantity` | integer | No | Number of tokens (1-10000, default: 1) |
| `range` | object | No | Map token values to range (default: 0-1000000) |
| `range.min` | integer | — | Minimum value (inclusive) |
| `range.max` | integer | — | Maximum value (exclusive) |
| `vertical` | string | No | Client type: `agent`, `npc`, `game`, `slot`, `lottery` |
| `idempotency_key` | string | No | Prevent duplicate requests |

**Response:**

```json
{
  "tokens": [
    {
      "value": 42,
      "leaf_hash": "84cf3f3fe20c2dc836fee973...",
      "node_id": "node-000000-2dc40c0a",
      "batch_id": "batch-2dc40c0a26f2b15e",
      "merkle_proof": {
        "root": "78838954f497f7e8...",
        "proof_path": [
          { "hash": "9ab698535d4b...", "position": "right" },
          { "hash": "8408b58a664f...", "position": "left" }
        ],
        "leaf_index": 0,
        "anchor_tx": "0x0e28c2e6b1d9cd58...",
        "anchor_block": 38397900,
        "polygon_scan": "https://amoy.polygonscan.com/tx/0x0e28..."
      }
    }
  ],
  "meta": {
    "quantity_requested": 1,
    "quantity_served": 1,
    "latency_ms": 2,
    "served_from_pool": true,
    "idempotency_key": null,
    "timestamp": "2026-05-15T06:11:40.905Z"
  }
}
```

**Response Headers:**

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Max requests per minute |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Seconds until rate limit resets |

**Verticals:**

| Vertical | Pool Mode | Description |
|---|---|---|
| `agent` | Shared | AI agents, bots, autonomous systems |
| `npc` | Shared | Game NPCs, simulated entities |
| `game` | Dedicated | Game sessions (isolated per client) |
| `slot` | Dedicated | Slot machines (isolated per client) |
| `lottery` | Dedicated | Lottery draws (isolated per client) |

Shared pool = instant access from pre-warmed pool. Dedicated = isolated per client with automatic refill.

---

### POST /v1/tokens/batch

Bulk token request. Same as `/tokens/request` but returns a compact format optimized for high-volume consumers.

**Auth:** Required (`x-api-key`)

**Request:**

```json
{
  "client_id": "simulation-001",
  "quantity": 1000,
  "range": { "min": 0, "max": 1000000 },
  "vertical": "agent"
}
```

**Response:**

```json
{
  "values": [758642, 123456, 999001, ...],
  "proofs": [
    {
      "leaf_hash": "84cf3f3f...",
      "batch_id": "batch-2dc4...",
      "merkle_root": "78838954...",
      "anchor_tx": "0x0e28c2e6...",
      "polygon_scan": "https://amoy.polygonscan.com/tx/0x..."
    }
  ],
  "meta": {
    "quantity_requested": 1000,
    "quantity_served": 1000,
    "latency_ms": 9,
    "timestamp": "2026-05-15T06:15:00.000Z"
  }
}
```

---

### POST /v1/tokens/verify

Verify a token against its on-chain Merkle root. **No authentication required** — verification should be open to anyone.

**Request:**

```json
{
  "leaf_hash": "84cf3f3fe20c2dc836fee9733df9bf2b4853bdfc2e41c215f68663295a21b3e3",
  "batch_id": "batch-2dc40c0a26f2b15e"
}
```

**Response (verified):**

```json
{
  "verified": true,
  "leaf_hash": "84cf3f3f...",
  "batch_id": "batch-2dc4...",
  "token": {
    "node_id": "node-000000-2dc40c0a",
    "node_index": 0,
    "value": 0.758642,
    "consumed": false,
    "consumed_at": null,
    "consumed_by": null
  },
  "batch": {
    "merkle_root": "78838954f497f7e8...",
    "status": "ready",
    "anchor_tx_hash": "0x0e28c2e6b1d9cd58...",
    "anchor_block_number": 38397900,
    "polygon_scan": "https://amoy.polygonscan.com/tx/0x0e28..."
  },
  "proof": {
    "valid": true,
    "proof_path": [...]
  },
  "polygon_contract": "0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8",
  "timestamp": "2026-05-15T06:40:38.721Z"
}
```

**Response (not found):**

```json
{
  "verified": false,
  "error": "Token not found",
  "leaf_hash": "...",
  "batch_id": "..."
}
```

---

### POST /v1/clients/register

Register a new client tenant with explicit configuration.

**Auth:** Required (`x-api-key`)

**Request:**

```json
{
  "client_id": "my-trading-bot",
  "name": "Alpha Trading Bot",
  "vertical": "agent",
  "refill_threshold": 0.35,
  "agent_name": "AlphaBot v2",
  "framework": "langchain"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Unique identifier (1-64 chars) |
| `name` | string | Yes | Human-readable name |
| `vertical` | string | Yes | `agent`, `npc`, `game`, `slot`, `lottery` |
| `refill_threshold` | number | No | Pool refill trigger (0.1-0.8, default: 0.35) |
| `agent_name` | string | No | Agent display name |
| `framework` | string | No | `langchain`, `crewai`, `autogpt`, `openclaw`, `custom` |

**Response:**

```json
{
  "client_id": "my-trading-bot",
  "vertical": "agent",
  "status": "registered",
  "pool_status": "warming",
  "message": "Client registered. Pool pre-warming — first tokens available in ~10s."
}
```

**Note:** Clients are also auto-registered on first `/v1/tokens/request` if they don't exist.

---

### GET /v1/stats

Operator dashboard with detailed system metrics.

**Auth:** Required (`x-api-key`)

**Response:**

```json
{
  "totalAnchors": 11,
  "totalTokensIssued": 1500,
  "p99LatencyMs": 2,
  "sharedPool": {
    "depth": 524000,
    "totalInjected": 524288,
    "tokensIssued": 1500,
    "fillPercent": 99.9,
    "activeBatches": 0
  },
  "vdfWorkers": [
    { "id": 0, "busy": false, "cyclesCompleted": 5, "currentClient": null }
  ],
  "refillQueueDepth": 0,
  "clients": [
    {
      "clientId": "my-agent",
      "vertical": "agent",
      "poolMode": "shared",
      "poolDepth": 524000,
      "fillPercent": 99.9,
      "tokensIssued": 1500,
      "activeBatches": 0
    }
  ],
  "generatorStats": {
    "activeBatches": 0,
    "completedBatches": 11,
    "totalTokensGenerated": 720896
  },
  "timestamp": "2026-05-15T06:30:00.000Z"
}
```

---

### GET /v1/batch/:batchId

Get metadata for a specific batch.

**Auth:** Required (`x-api-key`)

**Response:**

```json
{
  "batch_id": "batch-2dc40c0a26f2b15e",
  "polygon_scan": "https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8",
  "note": "Use getBatchRoot(batchId) on the contract to verify the Merkle root on-chain",
  "stats": { ... }
}
```

---

## Error Responses

All errors return JSON with an `error` field:

```json
{ "error": "Rate limit exceeded", "retry_after_ms": 45000, "retry_after_sec": 45 }
```

| Status | Error | Description |
|---|---|---|
| 400 | Validation failed | Invalid request body (includes `details` array) |
| 401 | Invalid API key | Missing or wrong `x-api-key` header |
| 404 | Token not found | Token doesn't exist in database |
| 429 | Rate limit exceeded | Too many requests (check `X-RateLimit-*` headers) |
| 500 | Internal server error | Server-side failure |

---

## Rate Limits

| Tier | Requests/min | Pool Mode |
|---|---|---|
| Free | 100 | Shared pool |
| Pro (planned) | 10,000 | Shared + dedicated |
| Enterprise (planned) | Unlimited | Dedicated + priority |

Rate limit headers are included on every `/v1/tokens/request` and `/v1/tokens/batch` response.

---

## Verification Flow

To independently verify any OpenRNG token:

1. **Get the token** — via `/v1/tokens/request` (includes `leaf_hash`, `batch_id`, `merkle_proof`)
2. **Verify the Merkle proof** — hash the leaf, walk the proof path, confirm the root matches
3. **Check on-chain** — call `getBatchRoot(batchId)` on the MerkleAnchor contract at `0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8` on Polygon Amoy
4. **Compare roots** — the root from the proof must match the root stored on-chain

Or use the API shortcut: `POST /v1/tokens/verify` does all of this for you.

---

## Smart Contract

**MerkleAnchor** on Polygon Amoy testnet:

- **Address:** `0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8`
- **Read functions (public, no auth):**
  - `getBatchRoot(string batchId)` → `(bytes32 root, uint256 blockNumber, uint256 timestamp, uint256 batchSize)`
  - `batchExists(string batchId)` → `bool`
  - `getStats()` → `(uint256 totalBatches, uint256 totalTokens)`

---

## SDK

For TypeScript/JavaScript, use `@openrng/sdk` instead of raw HTTP:

```typescript
import { OpenRNG } from '@openrng/sdk'

const rng = new OpenRNG({
  agentId: 'my-agent',
  endpoint: 'https://api.openrng.io',
  apiKey: 'your-key',
  vertical: 'agent',
})

const n = await rng.number({ min: 1, max: 100 })    // → { value: 42, proof: {...} }
const c = await rng.choose(['a', 'b', 'c'])          // → { choice: 'b', proof: {...} }
const s = await rng.shuffle([1, 2, 3, 4, 5])         // → { result: [3,1,5,2,4], proofs: [...] }
const d = await rng.dice(2, 6)                        // → { rolls: [4,2], total: 6, proofs: [...] }
const f = await rng.flip()                             // → { result: true, proof: {...} }
const b = await rng.batch(1000, { min: 0, max: 100 }) // → { values: [...], proofs: [...] }
const v = await OpenRNG.verify(n.proof)                // → { valid: true, onChain: true }
```

See [SDK README](../sdk/README.md) for full documentation.
