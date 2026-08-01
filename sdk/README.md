# @openrng/sdk

Verifiable random numbers for games, AI agents, and lotteries. Every outcome is provably fair via VDF (Verifiable Delay Function) with on-chain anchoring to Polygon.

## Quick Start

```typescript
import { OpenRNG } from '@openrng/sdk';

const rng = new OpenRNG({ apiKey: 'your-key' });

// Place a Sic Bo bet
const bet = await rng.placeSicBoBet('big', 10);
console.log(bet.game_id); // wait for VDF epoch resolution

// Wait for the result (~5s)
const result = await rng.waitForResult(bet.game_id);
console.log(result.result.won, result.result.payout);

// Verify the game's proof
const verified = await rng.verifyGame(bet.game_id);
console.log(verified.verified); // true
```

## Installation

```bash
npm install @openrng/sdk
```

## Decision Engine API (v0.2)

The Decision Engine provides provably fair games with VDF-based randomness.

### Games

```typescript
const rng = new OpenRNG({ apiKey: 'orn_xxx' });

// List available games
const catalog = await rng.getGames();

// Sic Bo — bet types: big, small, odd, even, total, single, double, triple, anyTriple, combo
const sicbo = await rng.placeSicBoBet('big', 10);
const sicboResult = await rng.waitForResult(sicbo.game_id);

// Dice — bet types: exact, over7, under7, odd, even
const dice = await rng.placeDiceBet('over7', 5);
const diceResult = await rng.waitForResult(dice.game_id);

// With options
const bet = await rng.placeSicBoBet('total', 10, {
  clientSeed: 'my-seed',
  playerId: 'player-1',
  value: 14,  // target total
});
```

### Raw Entropy

```typescript
// Generate raw verified entropy
const raw = await rng.generateRng('optional-client-seed');
const rawResult = await rng.waitForResult(raw.request_id);

// Get current VDF entropy
const entropy = await rng.getEntropy();
console.log(entropy.entropy, entropy.epoch);
```

### Verification & Stats

```typescript
// Verify any game
const proof = await rng.verifyGame(gameId);
console.log(proof.verified, proof.replay_steps);

// Get a game's status/result
const game = await rng.getGame(gameId);

// Recent games
const recent = await rng.getRecent();

// Platform statistics
const stats = await rng.getStats();
console.log(stats.resolvedGames, stats.currentEpoch);

// Health check
const health = await rng.getHealth();
```

## Configuration

```typescript
const rng = new OpenRNG({
  apiKey: 'orn_xxx',                // API key
  baseUrl: 'https://api.openrng.io', // Server URL (default)
  maxRetries: 3,                     // Retry count (default: 3)
  retryBaseDelayMs: 200,             // Base retry delay (default: 200ms)
  timeoutMs: 10000,                  // Request timeout (default: 10s)
});
```

## Legacy Token Pool API

The v0.1 token pool methods are still available for backward compatibility:

```typescript
const rng = new OpenRNG({
  agentId: 'my-agent',
  endpoint: 'https://api.openrng.io',
});

const result = await rng.number({ min: 1, max: 100 });
const choice = await rng.choose(['a', 'b', 'c'], { weights: [0.5, 0.3, 0.2] });
const shuffled = await rng.shuffle([1, 2, 3, 4, 5]);
const roll = await rng.dice(2, 6);
const coin = await rng.flip();
const bulk = await rng.batch(100, { min: 0, max: 1 });
const valid = await OpenRNG.verify(result.proof);
```

## VEO Client

For the V2 Verifiable Entropy Object (VEO-1) standard:

```typescript
import { VEOClient } from '@openrng/sdk';

const veo = new VEOClient();
const entropy = await veo.getEntropy({ policy: 'gaming-grade' });
const verified = await veo.verify(entropy);
```

## Error Handling

```typescript
import { OpenRNG, PoolExhaustedError, RateLimitError, AuthenticationError } from '@openrng/sdk';

try {
  const bet = await rng.placeSicBoBet('big', 10);
} catch (err) {
  if (err instanceof AuthenticationError) {
    // Invalid API key
  } else if (err instanceof RateLimitError) {
    // Back off for err.retryAfterMs
  } else if (err instanceof PoolExhaustedError) {
    // Server generating entropy — retry shortly
  }
}
```

## Zero Dependencies

Uses Node.js built-in `fetch` (Node 18+). No external dependencies.

## License

MIT
