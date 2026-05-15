<p align="center">
  <h1 align="center">OpenRNG</h1>
  <p align="center"><strong>Provably fair randomness for AI agents & gaming</strong></p>
  <p align="center">
    <a href="https://api.openrng.io">Live API</a> ·
    <a href="https://api.openrng.io/v1/health">Status</a> ·
    <a href="https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8">Contract</a>
  </p>
</p>

---

Every random number comes with a **cryptographic proof anchored to Polygon blockchain**. Request a token, verify it on-chain. No trust required.

**Patent:** *Method and System for Gaming Random Number Generation*

## Why

AI agents making autonomous decisions — trading, gaming, governance, simulations — need randomness that's **provably fair** and **independently verifiable**. Not "trust me" random. Cryptographically proven random.

OpenRNG generates random numbers using distributed beacon entropy ([drand](https://drand.love)), organizes them into Merkle trees, and anchors the root hash on Polygon. Anyone can verify any token without trusting the server.

## How It Works

```
 drand beacon ──→ Batch Generator ──→ Merkle Tree (65,536 leaves)
 (or VDF fallback)                           │
                                             ▼
                                      Merkle Root ──→ Polygon (immutable)
                                             │
                                             ▼
                                      Token Pool ──→ REST API (< 2ms)
                                             │
                                             ▼
                                      PostgreSQL (audit trail + verification)
```

1. **Generate** — drand beacon provides unpredictable entropy. 65,536 random tokens per batch, each a leaf in a Merkle tree.
2. **Anchor** — Merkle root hash written to Polygon. One transaction proves an entire batch.
3. **Serve** — Pre-generated pool delivers tokens in < 2ms with full Merkle proof paths.
4. **Verify** — Anyone can reconstruct the proof: leaf → Merkle path → root → check against on-chain record. Zero trust.

## Quick Start

### SDK (recommended)

```bash
npm install @openrng/sdk
```

```typescript
import { OpenRNG } from '@openrng/sdk'

const rng = new OpenRNG({
  agentId: 'my-agent',
  endpoint: 'https://api.openrng.io',
  apiKey: 'your-key',
  vertical: 'agent',
})

// Random number with cryptographic proof
const result = await rng.number({ min: 1, max: 100 })
// → { value: 42, proof: { leafHash, merkleRoot, batchId, polygonTx, polygonScan } }

// Weighted choice for agent decisions
const action = await rng.choose(['buy', 'sell', 'hold'], { weights: [0.3, 0.5, 0.2] })
// → { choice: 'sell', proof: {...} }

// Verify any proof (no auth required)
const valid = await OpenRNG.verify(result.proof)
// → { valid: true, onChain: true, polygonScan: '...' }
```

<details>
<summary><strong>More SDK examples</strong></summary>

```typescript
// Shuffle with proofs
const deck = await rng.shuffle([1, 2, 3, 4, 5])

// Dice roll
const dice = await rng.dice(2, 6)
// → { rolls: [4, 2], total: 6, proofs: [...] }

// Coin flip
const flip = await rng.flip()
// → { result: true, proof: {...} }

// Bulk batch (efficient for simulations)
const batch = await rng.batch(1000, { min: 0, max: 1 })
// → { values: [...], proofs: [...] }
```

</details>

### cURL

```bash
# Request a verified random token
curl -X POST https://api.openrng.io/v1/tokens/request \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"my-agent","quantity":1}'

# Verify a token (no auth required)
curl -X POST https://api.openrng.io/v1/tokens/verify \
  -H "Content-Type: application/json" \
  -d '{"leaf_hash":"<64-char-hex>","batch_id":"batch-xxx"}'
```

## API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v1/health` | No | System health + pool status |
| `POST` | `/v1/tokens/request` | Yes | Get random tokens with Merkle proofs |
| `POST` | `/v1/tokens/batch` | Yes | Bulk token request |
| `POST` | `/v1/tokens/verify` | No | Verify token against on-chain root |
| `POST` | `/v1/clients/register` | Yes | Register a client tenant |
| `GET` | `/v1/stats` | Yes | Operator dashboard |

### Token Response

```json
{
  "tokens": [{
    "value": 758642,
    "leaf_hash": "84cf3f3fe20c...",
    "batch_id": "batch-2dc40c0a...",
    "merkle_proof": {
      "root": "78838954f497...",
      "proof_path": [{"hash": "...", "position": "right"}, ...],
      "anchor_tx": "0x0e28c2e6b1d9...",
      "polygon_scan": "https://amoy.polygonscan.com/tx/0x0e28..."
    }
  }],
  "meta": {
    "quantity_served": 1,
    "latency_ms": 2,
    "served_from_pool": true
  }
}
```

## Architecture

### Entropy

- **Primary: [drand](https://drand.love)** — Distributed randomness beacon (quicknet chain, ~3s rounds). BLS-signed, publicly verifiable.
- **Fallback: Local VDF** — Sequential hash chain when drand is unreachable. Configurable computation time.

### Verification Chain

```
Token leaf hash
    → Merkle proof path (16 levels for 65K batch)
        → Merkle root
            → On-chain record (Polygon)
                → PolygonScan link
```

Every token carries its full proof path. Verification is O(log n) — 16 hash operations for a 65,536-token batch.

### Performance

| Metric | Value |
|--------|-------|
| Token latency | < 2ms |
| Sustained throughput | 1,000 req/s |
| Burst throughput | 5,000 req/s |
| Batch size | 65,536 tokens |
| Anchor cost | ~0.001 MATIC per batch |
| Anchor time | ~6s (2 confirmations) |

### Pool Architecture

- **Shared pool** — For `agent` and `npc` verticals. Pre-warmed with 524K+ tokens for instant access.
- **Dedicated pools** — For `slot`, `game`, `lottery` verticals. Isolated per client with automatic refill.
- Tokens are usable immediately. Blockchain anchoring happens async — proofs update once confirmed.

## Self-Hosting

### Prerequisites

- Node.js 18+
- PostgreSQL (optional — runs in-memory without it)
- Polygon wallet with MATIC (for anchoring)

### Setup

```bash
git clone https://github.com/ned-del/openrng.git && cd openrng
npm install
cp .env.example .env  # Edit with your config

# Optional: set up PostgreSQL
npx ts-node scripts/migrate.ts

# Run
npm run dev
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `POLYGON_RPC_URL` | — | Polygon RPC endpoint |
| `DEPLOYER_PRIVATE_KEY` | — | Wallet private key for anchoring |
| `MERKLE_ANCHOR_CONTRACT` | — | Deployed contract address |
| `VDF_T_SECONDS` | `4` | VDF computation time (fallback) |
| `VDF_WORKERS` | `3` | Parallel VDF workers |
| `BATCH_SIZE` | `65536` | Tokens per Merkle batch |
| `API_SECRET` | — | API authentication key |
| `RATE_LIMIT_PER_MIN` | `100` | Per-client rate limit |

### Deploy Contract

```bash
npx hardhat compile
npx ts-node scripts/deploy.ts
# Copy the contract address to MERKLE_ANCHOR_CONTRACT in .env
```

## Project Structure

```
openrng/
├── src/
│   ├── api/routes.ts            # REST API
│   ├── blockchain/anchor.ts     # Polygon integration (serialized tx queue)
│   ├── db/                      # PostgreSQL (optional)
│   ├── rng/
│   │   ├── drand.ts             # drand beacon + VDF fallback
│   │   ├── engine.ts            # Merkle tree builder + batch generator
│   │   └── pool-manager.ts      # Pool orchestration + rate limiting
│   ├── landing.ts               # Developer landing page
│   └── index.ts                 # Entry point
├── sdk/                         # @openrng/sdk — TypeScript client
├── contracts/                   # MerkleAnchor.sol (Solidity)
├── scripts/                     # Deploy + migrate
├── stress/                      # Load testing scenarios
└── tests/                       # Core test suite
```

## Smart Contract

**MerkleAnchor.sol** — Polygon Amoy testnet

| | |
|---|---|
| **Contract** | [`0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8`](https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8) |
| **Network** | Polygon Amoy (chain ID 80002) |
| **Functions** | `anchorBatch()` · `getBatchRoot()` · `batchExists()` · `getStats()` |

Stores Merkle root hashes immutably. Anyone can call `getBatchRoot(batchId)` to verify — no authentication needed.

## Use Cases

- **AI Agents** — Provably fair decisions for trading bots, game NPCs, autonomous agents
- **Agent vs Agent** — Verifiable randomness in competitive multi-agent environments
- **Gaming** — Slots, lotteries, card games with on-chain proof
- **Governance** — Fair committee selection, random auditing
- **Simulations** — Reproducible randomness with full audit trail

## Testing

```bash
npm test  # 11 core tests (mock blockchain, no PostgreSQL required)
```

## License

Proprietary — Patent pending.

---

<p align="center">
  <strong>Built for agents that need to prove they play fair.</strong>
</p>
