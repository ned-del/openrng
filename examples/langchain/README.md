# OpenRNG × LangChain

Use provably fair, on-chain-verified random numbers in your LangChain agents.

## What This Does

Wraps the OpenRNG API as LangChain `Tool` classes so any LLM agent can:

- **`openrng_random_number`** — Generate random numbers in a range with Merkle proofs
- **`openrng_random_choice`** — Pick from a list with provably fair randomness
- **`openrng_verify_proof`** — Independently verify any result on-chain

Every random number is backed by a VDF + Merkle tree, anchored on Polygon. No one — not even the server operator — can predict or manipulate the output.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Make sure OpenRNG is running
cd ../..
npm run dev

# 3. Set your API key
export OPENRNG_API_KEY="your-api-key"
# Or register one: curl -X POST http://localhost:3000/v1/keys/register \
#   -H 'Content-Type: application/json' \
#   -d '{"email":"you@example.com","name":"My Agent"}'

# 4. Run the demo
npx ts-node demo.ts
```

## Usage in Your Agent

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { createOpenRNGTools } from './openrng-tool';

const llm = new ChatOpenAI({ model: 'gpt-4o' });
const tools = createOpenRNGTools({
  apiUrl: 'http://localhost:3000',
  apiKey: process.env.OPENRNG_API_KEY!,
});

const agent = createReactAgent({ llm, tools });

// The agent can now generate provably fair random numbers
const result = await agent.invoke({
  messages: [{
    role: 'user',
    content: 'Roll a d20 for my attack and verify the result is fair'
  }],
});
```

## Tool Descriptions

### `openrng_random_number`

```json
{ "min": 1, "max": 100, "quantity": 3 }
```

Returns random numbers with Merkle proofs and optional PolygonScan links.

### `openrng_random_choice`

```json
{ "options": ["Alice", "Bob", "Charlie"] }
```

Picks one option with a verifiable proof of fairness.

### `openrng_verify_proof`

```json
{ "leaf_hash": "abc123...", "batch_id": "batch-xyz" }
```

Verifies a previously generated number against its on-chain Merkle root.

## Why This Matters

AI agents making decisions with random elements (games, lotteries, NPC behavior, fair selection) need randomness that's:

1. **Unpredictable** — No one can game it
2. **Verifiable** — Anyone can check the proof after the fact
3. **Tamper-proof** — Anchored on-chain, immutable

OpenRNG provides all three. Your agent's "random" decisions become provably fair.
