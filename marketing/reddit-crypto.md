# r/cryptocurrency Post

**Title:** Open-source verifiable randomness anchored on Polygon Amoy (testnet) — no oracle fees, no VRF subscriptions

---

I've been building an open-source verifiable random number generation system and wanted to share it with the community. It's live as a Telegram bot right now, with an SDK in development.

**The problem:**

On-chain randomness is either expensive (Chainlink VRF subscriptions), centralized (API calls to some server), or gameable (blockhash-based). Off-chain randomness is worse — you're trusting someone's `Math.random()`.

**What OpenRNG does differently:**

OpenRNG is a hybrid system that generates provably fair random numbers off-chain but anchors proofs on-chain. Here's the full pipeline:

1. **VDF computation** — A Verifiable Delay Function generates randomness that requires a fixed, sequential computation time. You can't parallelize it, you can't shortcut it. The output is deterministic from its input but takes real wall-clock time to produce.

2. **drand beacon** — We combine VDF outputs with [drand](https://drand.love/) public randomness rounds. drand is a decentralized randomness beacon run by a global network of institutions. This adds external entropy that nobody — including us — can predict.

3. **Merkle tree batching** — Generated values are batched into Merkle trees. Each value gets a proof (path from leaf to root) that cryptographically ties it to the batch.

4. **Polygon anchoring** — Merkle roots are periodically anchored on **Polygon Amoy testnet** (mainnet migration planned). The on-chain timestamp proves the values existed at a specific time — before anyone requested them.

**Anchor contract:** [`0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8`](https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8) on Amoy (chain ID 80002). Go look at the transactions — they're real.

**The result:** When you request a random number, you're not getting a freshly generated value. You're getting a *pre-committed* value that was locked in before you asked. The Merkle proof ties it to the on-chain root. Anyone can verify independently.

**What's live now:**

- **Telegram bot:** [@OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot) — `/roll`, `/flip`, `/pick`, `/shuffle`, `/raffle`, `/lottery`, and more
- **Verification:** `/verify` any result — see the Merkle proof and on-chain anchor
- **SDK:** In development — will be open-sourced alongside the full codebase

**What this means for builders:**

If you're building anything that needs provable fairness — games, lotteries, NFT mints, governance selection, random airdrops — this architecture could work for you. Once the SDK is published, it'll be a single import, one function call.

No oracle subscriptions. No gas fees for individual random numbers. The anchoring cost is amortized across the entire Merkle batch.

**Current status:** Working testnet build. The bot is fully operational with real cryptographic proofs. Code will be open-sourced once it's production-ready. Mainnet migration after sufficient testing.

**Try the bot:** [t.me/OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot)

This isn't a token project, there's no ICO, no governance token. It's infrastructure. Verifiable randomness should be a public good, not a profit center.

Happy to go deep on the VDF implementation, Merkle tree construction, or anchoring strategy. AMA.
