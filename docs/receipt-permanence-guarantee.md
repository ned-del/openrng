# Receipt Permanence Guarantee

**Date:** 2026-08-03  
**Status:** Formal Commitment

---

## Our Promise

Every Committed Selection Receipt (CSR) issued by Fairseal is verifiable forever — independent of Fairseal's servers, APIs, or continued existence as a company.

This is not a marketing claim. It is a design constraint baked into the protocol.

---

## What "Permanent" Means

A receipt is **permanently verifiable** if a third party can, at any future time:

1. Obtain the receipt JSON (from any source — the operator, a customer, an archive).
2. Connect to any Base mainnet RPC endpoint (or run their own Base node).
3. Run the verification algorithm locally.
4. Reach a definitive pass or fail verdict — without contacting Fairseal.

We commit that every receipt we issue satisfies this condition.

---

## How It Works

### Base Mainnet as Permanent Storage

Every commitment is anchored in a transaction on Base mainnet. Base is an Ethereum L2 with calldata posted to Ethereum L1. Once a block is finalized:

- The commitment transaction cannot be removed.
- The epoch block hash cannot be changed.
- The Merkle root anchored in the transaction cannot be altered.

Base inherits Ethereum's security guarantees. Ethereum has been running continuously since 2015. We expect this to continue.

### No Dependency on Fairseal Servers

Receipt verification uses:

| Input | Source |
|---|---|
| `epoch.anchor_tx` | Base blockchain (public) |
| `epoch.target_block` hash | Base blockchain (public) |
| `commitment.merkle_root` | Extracted from anchor_tx logs (public) |
| `reveal.seed` | Published by operator in receipt JSON |
| `client_salt` | Published by operator at reveal time |
| Candidates list | Published by operator or provided by customer |

The operator publishes all secret inputs (`operator_seed`, `client_salt`) at reveal time. Once published and recorded, these cannot be retracted. The receipt JSON is the self-contained verification bundle.

### @fairseal/core SDK — Fully Local Verification

> **Note:** The SDK package will be published as `@fairseal/core`. Currently available as `@openrng/core` during transition.

```bash
npm install @fairseal/core
```

```javascript
import { verifyReceipt } from '@fairseal/core';

const result = await verifyReceipt(receiptJson, {
  rpcUrl: 'https://mainnet.base.org'  // Any Base RPC, including your own
});

console.log(result.verified);  // true / false
console.log(result.steps);     // Step-by-step audit trail
```

The SDK:
- Fetches only public blockchain data.
- Performs all cryptographic verification locally.
- Returns a structured audit trail explaining each verification step.
- Has no telemetry or Fairseal API calls.

---

## What Happens If Fairseal Disappears

If Fairseal ceases operations:

1. **Receipts remain valid.** The blockchain data they reference does not disappear.
2. **The SDK remains usable.** It is open-source and can be forked by anyone.
3. **Verification remains possible.** Anyone with a Base RPC can verify any historical receipt.
4. **New receipts cannot be issued.** The oracle service stops, but existing receipts are unaffected.

We will publish a final archive of all issued receipts and the verification SDK before any shutdown, with at least 90 days notice.

---

## What This Guarantee Does NOT Cover

- **Candidate list permanence.** We record a `candidates_hash` in the receipt, but the actual candidate list must be preserved by the operator or customer. We recommend customers archive their candidate lists alongside their receipts.
- **Future network access.** If Base mainnet ceases to exist (an extremely unlikely scenario), receipts could not be re-verified via RPC. They would still be verifiable against an archived copy of the blockchain state.
- **Receipt discovery.** We do not guarantee that we will maintain a searchable index of all receipts. Receipts are self-contained — customers should retain their own copies.

---

## Our Commitment in Plain Language

> We built this so you don't have to trust us.
>
> Every receipt we issue can be verified without us. The proof is on Base. The SDK is open source. The algorithm is documented in the CSR specification.
>
> If we disappear tomorrow, your receipts still work. That was the point.

---

## Verification Resources

- **Base RPC (public):** `https://mainnet.base.org`
- **Block explorer:** `https://basescan.org`
- **@fairseal/core SDK:** `npm install @fairseal/core` (currently `@openrng/core` during transition)
- **CSR specification:** `docs/csr-spec-v0.1.md`
- **Offline verification steps:** See CSR spec § "Offline Verification"

---

*This document is part of the Fairseal protocol documentation (formerly OpenRNG). It is a commitment to customers, not a technical specification. For technical details, see csr-spec-v0.1.md and security-model-v0.1.md.*
