# OpenRNG

**Hybrid drand/VDF + Merkle verifiable random number generation platform for gaming.**

Patent: *Method and System for Gaming Random Number Generation*

## Architecture

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐
│  drand       │────→│  Batch        │────→│  Merkle Tree     │
│  Beacon      │     │  Generator    │     │  Builder         │
│  (quicknet)  │     │               │     │  (N leaf hashes) │
└─────────────┘     └───────────────┘     └────────┬─────────┘
       │                                            │
       │ fallback                                   ▼
┌─────────────┐                          ┌──────────────────┐
│  Local VDF   │                          │  Merkle Root     │
│  (hash chain)│                          │  → Polygon Amoy  │
└─────────────┘                          └────────┬─────────┘
                                                   │
                                                   ▼
                                         ┌──────────────────┐
                                         │  Token Pool      │
                                         │  → REST API      │
                                         │  (< 2ms latency) │
                                         └──────────────────┘
                                                   │
                                                   ▼
                                         ┌──────────────────┐
                                         │  PostgreSQL      │
                                         │  (persistence &  │
                                         │   verification)  │
                                         └──────────────────┘
```

### Key Properties

1. **Anti-preview**: drand beacon randomness (or local VDF fallback) ensures no one can predict tokens before generation
2. **Publicly verifiable**: Anyone can verify drand round X produced randomness Y, and reconstruct Merkle proofs
3. **Blockchain-anchored**: Merkle root hashes stored immutably on Polygon for tamper detection
4. **Efficient**: 1 blockchain transaction per N tokens (default 65,536)
5. **Low latency**: Pre-generated token pool serves at < 2ms
6. **Persistent**: PostgreSQL stores all batches, tokens, and clients for full audit trail

### Entropy Sources

- **Primary: [drand](https://drand.love)** — Distributed randomness beacon (quicknet chain, ~3s rounds). BLS-signed, publicly verifiable by anyone.
- **Fallback: Local VDF** — Sequential hash chain (configurable T seconds). Used when drand is unreachable.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 17 (optional — runs in-memory without it)
- Polygon Amoy testnet wallet (for blockchain anchoring)

### Setup

```bash
# Clone and install
git clone <repo-url> && cd openrng
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Set up PostgreSQL (optional)
brew install postgresql@17
brew services start postgresql@17
createdb openrng

# Update .env with your local DATABASE_URL:
# DATABASE_URL=postgresql://yourusername@localhost:5432/openrng

# Run database migration
npx ts-node scripts/migrate.ts

# Run tests
npm test

# Start development server
npm run dev
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/health` | No | System health check |
| POST | `/v1/clients/register` | Yes | Register a client tenant |
| POST | `/v1/tokens/request` | Yes | Get RN tokens with Merkle proofs |
| POST | `/v1/tokens/verify` | No | Verify a token against on-chain root |
| GET | `/v1/stats` | Yes | Operator dashboard |
| GET | `/v1/batch/:batchId` | Yes | Batch metadata |

### Example: Request Tokens

```bash
curl -X POST http://localhost:3000/v1/tokens/request \
  -H "x-api-key: your-api-secret" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"demo-casino-001","quantity":1,"vertical":"slot"}'
```

### Example: Verify a Token

```bash
curl -X POST http://localhost:3000/v1/tokens/verify \
  -H "Content-Type: application/json" \
  -d '{"leaf_hash":"<64-char-hex>","batch_id":"batch-xxx"}'
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API server port |
| `DATABASE_URL` | — | PostgreSQL connection string (optional) |
| `POLYGON_RPC_URL` | — | Polygon RPC endpoint |
| `DEPLOYER_PRIVATE_KEY` | — | Wallet key for anchoring |
| `MERKLE_ANCHOR_CONTRACT` | — | Deployed contract address |
| `VDF_T_SECONDS` | 4 | VDF computation time (fallback) |
| `VDF_WORKERS` | 3 | Parallel VDF worker count |
| `BATCH_SIZE` | 65536 | Tokens per batch |
| `POOL_REFILL_THRESHOLD` | 0.35 | Pool refill trigger (0.0-1.0) |
| `API_SECRET` | — | API authentication key |

## Project Structure

```
openrng/
├── src/
│   ├── api/routes.ts          # REST API endpoints
│   ├── blockchain/anchor.ts   # Polygon Amoy integration
│   ├── db/
│   │   ├── index.ts           # Connection pool (optional)
│   │   └── repositories.ts    # CRUD for batches/tokens/clients
│   ├── rng/
│   │   ├── drand.ts           # drand beacon client + fallback
│   │   ├── engine.ts          # Core: Merkle tree, VDF, batch gen
│   │   └── pool-manager.ts    # Orchestrator: workers → anchor → pool
│   ├── utils/logger.ts        # Winston logger
│   └── index.ts               # Server entry point
├── contracts/                  # MerkleAnchor.sol
├── scripts/
│   ├── deploy.ts              # Contract deployment
│   └── migrate.ts             # PostgreSQL schema migration
├── tests/core.test.ts         # 11 core tests
└── .env                       # Environment config
```

## Testing

```bash
npm test          # Run all 11 tests
```

Tests use mock blockchain and in-memory mode (no PostgreSQL required).

## Contract

**MerkleAnchor.sol** — deployed on Polygon Amoy testnet at `0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8`

Stores Merkle root hashes immutably. Anyone can call `getBatchRoot(batchId)` to verify.

## License

Proprietary — Patent pending.
