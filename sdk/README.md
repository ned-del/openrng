# @openrng/sdk

Verifiable random numbers for AI agents, games, and lotteries. Every number comes with a cryptographic proof anchored to Polygon blockchain.

## Quick Start

```typescript
import { OpenRNG } from '@openrng/sdk'

const rng = new OpenRNG({
  agentId: 'my-agent-001',
  endpoint: 'http://localhost:3000',
  apiKey: 'your-api-key',
  vertical: 'agent',  // 'agent' | 'npc' | 'game' | 'slot' | 'lottery'
})

// Random number with proof
const result = await rng.number({ min: 1, max: 100 })
// → { value: 42, proof: { leafHash, merkleRoot, batchId, polygonTx, polygonScan } }

// Weighted choice
const action = await rng.choose(['buy', 'sell', 'hold'], { weights: [0.3, 0.5, 0.2] })
// → { choice: 'sell', index: 1, value: 0.42, proof: {...} }

// Shuffle with proofs
const deck = await rng.shuffle([1, 2, 3, 4, 5])
// → { result: [3, 1, 5, 2, 4], proofs: [...] }

// Dice roll
const dice = await rng.dice(2, 6)
// → { rolls: [4, 2], total: 6, proofs: [...] }

// Coin flip
const flip = await rng.flip()
// → { result: true, proof: {...} }

// Bulk batch (efficient for simulations)
const batch = await rng.batch(1000, { min: 0, max: 1 })
// → { values: [0, 1, 0, ...], proofs: [...] }

// Verify any proof (no auth required)
const valid = await OpenRNG.verify(result.proof, 'http://localhost:3000')
// → { valid: true, onChain: true, batchId: '...', polygonScan: '...' }
```

## Installation

```bash
npm install @openrng/sdk
```

## Configuration

```typescript
const rng = new OpenRNG({
  agentId: 'my-agent',        // Required: unique client ID
  endpoint: 'http://...',     // Required: OpenRNG server URL
  apiKey: 'key',              // Optional: API key
  vertical: 'agent',          // Optional: client type
  agentName: 'My Agent',      // Optional: human-readable name
  framework: 'langchain',     // Optional: 'langchain' | 'crewai' | 'autogpt' | 'openclaw' | 'custom'
  maxRetries: 3,              // Optional: retry count (default: 3)
  retryBaseDelayMs: 200,      // Optional: base retry delay (default: 200ms)
  timeoutMs: 10000,           // Optional: request timeout (default: 10s)
})
```

## Error Handling

```typescript
import { OpenRNG, PoolExhaustedError, RateLimitError, AuthenticationError } from '@openrng/sdk'

try {
  const result = await rng.number({ min: 1, max: 100 })
} catch (err) {
  if (err instanceof PoolExhaustedError) {
    // Server is generating more tokens — retry shortly
  } else if (err instanceof RateLimitError) {
    // Back off for err.retryAfterMs
  } else if (err instanceof AuthenticationError) {
    // Bad API key
  }
}
```

## Zero Dependencies

The SDK uses Node.js built-in `fetch` (Node 18+) and `http`/`https` agents. No external dependencies.

## License

MIT
