# ElizaOS Plugin Design: @elizaos/plugin-fairseal

**Version:** 0.1  
**Date:** 2026-08-03  
**Status:** Design Draft

---

## Overview

The Fairseal ElizaOS plugin gives AI agents a drop-in capability for **provably fair random selection**. Agents can commit to a selection before the outcome is known, wait for the epoch reveal, and verify the result — all through natural language actions that compose with the agent's existing decision-making flow.

The key engineering challenge: a commit-reveal cycle spans multiple agent turns (typically 2–5 minutes apart). The plugin must persist intermediate state across turns without requiring the agent to hold context in memory.

---

## Plugin Configuration

```typescript
// eliza.config.ts

import { fairsealPlugin } from '@elizaos/plugin-fairseal';

export default {
  plugins: [
    fairsealPlugin({
      apiKey: process.env.FAIRSEAL_API_KEY,
      network: 'base-mainnet',           // 'base-mainnet' | 'base-sepolia'
      defaultEpochDistance: 3,           // blocks to wait before reveal (min: 2)
      clientSaltEnabled: true,           // recommended: true
      persistenceAdapter: 'sqlite',      // 'sqlite' | 'postgres' | 'memory'
      receiptStorePath: './receipts/',   // local archive of issued receipts
      rpcUrl: process.env.BASE_RPC_URL   // optional override; defaults to public endpoint
    })
  ]
};
```

---

## Actions

### Action 1: COMMIT_SELECTION

**Trigger phrases (examples):**
- "Pick a winner fairly"
- "Randomly select from this list"
- "Commit to a random choice"
- "Fair draw from [list]"

**What it does:**
1. Accepts a list of candidates (from agent context or message).
2. Generates `client_salt` internally (if `clientSaltEnabled`).
3. Submits commitment to Fairseal API.
4. Receives `commit_id`, `epoch.target_block`, and `anchor_tx`.
5. Persists commit state to the configured adapter.
6. Returns a human-readable confirmation with the `anchor_tx` hash.

**Input:**
```typescript
{
  action: 'COMMIT_SELECTION',
  candidates: string[],          // list of items to select from
  n_winners?: number,            // default: 1
  context?: string               // optional label for this selection
}
```

**Output:**
```typescript
{
  commit_id: string,
  anchor_tx: string,
  target_block: number,
  estimated_reveal_at: string,   // ISO-8601 estimated time
  message: string                // human-readable: "Committed to Base block 12345678. I'll reveal the winner once the block is mined (~2 minutes)."
}
```

**Example agent response:**
> "Done! I've committed this draw to the Base blockchain. Transaction: `0x7f3a...`. The winner will be revealed once block #12,456,789 is mined — about 2 minutes from now. I can't change the outcome after this point."

---

### Action 2: AWAIT_REVEAL

**Trigger phrases (examples):**
- "Is the winner ready?"
- "What's the result?"
- "Reveal the winner"
- "Check the draw"

**What it does:**
1. Looks up the `commit_id` from persistence layer (matched by context or conversation ID).
2. Checks if `epoch.target_block` has been mined.
3. If not mined: returns a status update with estimated time.
4. If mined: calls Fairseal API to fetch the reveal and receipt.
5. Validates the receipt cryptographically (client-side using `@fairseal/core`).
6. Returns the winner(s) + receipt link.

**Input:**
```typescript
{
  action: 'AWAIT_REVEAL',
  commit_id?: string  // optional; inferred from conversation context if omitted
}
```

**Output (pending):**
```typescript
{
  status: 'pending',
  blocks_remaining: number,
  estimated_at: string,
  message: string   // "Still waiting for block #12,456,789. About 45 seconds to go."
}
```

**Output (ready):**
```typescript
{
  status: 'revealed',
  winners: string[],
  receipt_id: string,
  receipt_url: string,          // publicly shareable verification link
  receipt_json: object,         // full CSR receipt
  message: string               // human-readable result with verification link
}
```

**Example agent response:**
> "The winner is: **@player_42**! 🎉
>
> This result was committed before the epoch block was mined — nobody could have changed it. Verify it yourself: [receipt link]
>
> Receipt ID: `csr-0.1-7f3a9b...`"

---

### Action 3: VERIFY_RECEIPT

**Trigger phrases (examples):**
- "Verify this receipt"
- "Is this draw legit?"
- "Check receipt [ID or JSON]"
- "Audit the selection"

**What it does:**
1. Accepts a receipt ID, receipt URL, or raw receipt JSON.
2. Fetches the receipt if needed.
3. Runs the full 9-step offline verification against the Base RPC.
4. Returns a structured audit report in plain language.

**Input:**
```typescript
{
  action: 'VERIFY_RECEIPT',
  receipt: string | object  // receipt_id, URL, or raw JSON
}
```

**Output:**
```typescript
{
  verified: boolean,
  steps: {
    step: number,
    description: string,
    passed: boolean,
    detail?: string
  }[],
  message: string  // "✅ This receipt is valid. All 9 verification steps passed."
                   // or "❌ Step 3 failed: anchor transaction is AFTER the epoch block."
}
```

**Example agent response:**
> "✅ I verified this receipt. Here's what I checked:
>
> 1. Schema valid ✓
> 2. receipt_id matches ✓
> 3. Anchor tx is before epoch block ✓
> 4. Epoch block hash matches Base ✓
> 5. Merkle proof valid ✓
> 6. Seed computation matches ✓
> 7. Selection algorithm matches ✓
> 8. Candidates hash matches ✓
> 9. No replay detected ✓
>
> This selection was committed before the winner could be known."

---

## Example Conversation

```
User: "We have 500 NFT holders. Pick 3 winners for the airdrop fairly."

Agent: "Sure! I'll use Fairseal to make this verifiable. Give me a second..."
       [calls COMMIT_SELECTION with 500 candidates, n_winners=3]
       "Done! Committed to Base block #12,456,789. Transaction: 0x7f3a...
       I'll reveal the winners in about 2 minutes once the block is mined.
       After that point, even I can't change the result."

[2 minutes later]

User: "Who won?"

Agent: [calls AWAIT_REVEAL]
       "The 3 winners are:
       1. 0xabc...123 (holder #42)
       2. 0xdef...456 (holder #187)
       3. 0x789...abc (holder #391)
       
       Verify the draw yourself: [receipt link]
       Anyone can check that these 3 were selected fairly before the block was mined."

User: "Can you verify that receipt link I found from another project?"

Agent: [calls VERIFY_RECEIPT with the URL]
       "✅ Verified. All 9 steps passed. That draw was committed before the epoch block."
```

---

## Async Error Handling

The commit-reveal cycle introduces async complexity that must be handled gracefully:

| Error Case | Handling |
|---|---|
| **Epoch block not yet mined** | Return pending status with ETA; do not error |
| **Epoch block reorged** | Auto-retry with next available block; notify user |
| **API timeout during commit** | Return error; do not persist partial state |
| **API timeout during reveal** | Retry 3x with exponential backoff; fall back to on-chain verification |
| **Receipt verification fails** | Return detailed step-by-step failure report; do not suppress |
| **commit_id not found in persistence** | Ask user for context; do not guess |
| **RPC unavailable** | Fall back to secondary RPC if configured; surface error if all fail |

---

## Persistence Requirements

The commit-reveal cycle typically spans 2–10 minutes (1–5 agent turns). The plugin must persist:

```typescript
interface CommitRecord {
  commit_id: string;
  conversation_id: string;
  created_at: string;           // ISO-8601
  candidates: string[];
  n_winners: number;
  anchor_tx: string;
  target_block: number;
  client_salt?: string;         // kept secret until reveal
  status: 'committed' | 'revealed' | 'failed';
  receipt?: object;             // populated on reveal
}
```

**Why persistence is required:**
- Agent memory (in-context) may be cleared between turns.
- The user may ask "who won?" hours after the commit, in a new session.
- Receipts should be archived for audit purposes regardless of conversation lifecycle.

**Recommended adapter:** SQLite for single-instance agents; Postgres for multi-instance deployments.

---

## Integration Notes

- The plugin is stateless on the API side — all state lives in the agent's persistence layer.
- The plugin can be used without `clientSaltEnabled`, but this reduces security guarantees (see security model).
- For high-stakes selections (>100 participants, prize value >$1,000), enable `clientSaltEnabled: true` and consider requesting participants contribute their own salts.
- The `VERIFY_RECEIPT` action can verify receipts from any Fairseal-compatible operator, not just your own.

---

*Plugin repository: github.com/fairseal/eliza-plugin (coming soon)*
