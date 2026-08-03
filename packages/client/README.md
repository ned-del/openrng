# @openrng/client

**One-line provably fair selection.**

> Prove the outcome wasn't chosen after the fact.

```typescript
import { OpenRNGClient } from '@openrng/client';

const client = new OpenRNGClient();
const result = await client.fairSelect({
  candidates: ['alice', 'bob', 'charlie'],
  domain: 'grant-allocation',
  epochOffset: 3,
});

console.log(result.winner);           // 'bob'
console.log(result.proof.verifyUrl);  // https://verify.openrng.io/340327
console.log(result.receipt);          // { id, epoch, candidateSetHash, commitTime, domain }
```

## Install

```bash
npm install @openrng/client
```

## What It Does

Under the hood, `fairSelect` runs the full commit/reveal protocol:

1. **Hashes** your candidate list with SHA256 before any randomness is involved
2. **Commits** to a future VDF epoch — the API records your candidate hash on-chain
3. **Waits** for the epoch to mature (VDF is sequential — even the operator can't preview it)
4. **Verifies** locally: commitment hash matches + epoch came AFTER commitment
5. **Derives** the winner: `BigInt(value) % candidates.length`

## API

### `new OpenRNGClient(options?)`

| Option | Default | Description |
|---|---|---|
| `baseUrl` | `https://x402.openrng.io/v1/rng` | Override API endpoint |
| `pollIntervalMs` | `2000` | How often to poll for reveal |
| `maxPollAttempts` | `30` | Max poll attempts before timeout |

### `client.fairSelect(opts): Promise<FairSelectResult>`

| Option | Default | Description |
|---|---|---|
| `candidates` | *(required)* | Array of candidate strings |
| `domain` | `'openrng-fair-select'` | Label for this draw (auditing) |
| `epochOffset` | `3` | Epochs ahead to commit (~7s/epoch) |

### `FairSelectResult`

```typescript
{
  winner: string;           // The selected candidate
  winnerIndex: number;      // Zero-based index in the candidates array
  receipt: {
    id: string;             // commitment_id — share this publicly before reveal
    epoch: number;          // Which VDF epoch holds the randomness
    candidateSetHash: string;  // SHA256 of your candidate list (verifiable)
    commitTime: string;     // ISO timestamp of commit
    domain: string;
  };
  proof: {
    value: string;          // Raw random hex value
    verifyUrl: string;      // Public verification URL
    temporalValid: boolean; // Epoch computed AFTER commitment
    commitHashVerified: boolean;  // Candidate hash matched
    note: string;           // Human-readable verification summary
  };
}
```

## Auditability Pattern

For maximum trust, publish `result.receipt` **before** anyone sees the winner:

```typescript
const { receipt } = await client.fairSelect({ candidates, domain });

// ✅ Publish receipt FIRST — anyone can save this and verify later
await publishTweet(JSON.stringify(receipt));

// Then announce winner
console.log('Winner:', result.winner);
```

Auditors can then:
1. Call `GET https://x402.openrng.io/v1/rng/reveal/<receipt.id>`
2. Recompute `SHA256(candidates.join(','))` and compare to `receipt.candidateSetHash`
3. Confirm `temporal_valid: true` — epoch came after your commit timestamp
4. Visit `proof.verifyUrl` for on-chain anchor

## Direct API (no SDK)

If you prefer raw HTTP, the endpoints are:

```bash
# Commit
curl -X POST https://x402.openrng.io/v1/rng/commit \
  -H 'Content-Type: application/json' \
  -d '{"epoch_offset":3,"candidate_set_hash":"<sha256hex>","domain":"my-draw"}'

# Reveal (free, no auth)
curl https://x402.openrng.io/v1/rng/reveal/<commitment_id>
```

See [`examples/fair-selection-ts`](../../examples/fair-selection-ts) for the 30-line tutorial.
See [`examples/fair-selection-py`](../../examples/fair-selection-py) for the Python version.
