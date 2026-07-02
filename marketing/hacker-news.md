# Hacker News — Show HN

## Title

Show HN: OpenRNG – Provably fair randomness using VDF + Merkle trees + Polygon anchoring

## URL

https://t.me/OpenRNG_Dice_Bot

*(Swap to github.com/openrng once repo is public — HN strongly prefers code links)*

## Comment

OpenRNG generates random numbers that are cryptographically committed before anyone requests them.

The pipeline: a VDF (Verifiable Delay Function) chain produces sequential, non-parallelizable outputs. These are combined with drand beacon rounds for external entropy. The resulting values are batched into Merkle trees, and roots are periodically anchored on Polygon with on-chain timestamps.

When a user requests a random number, they receive a pre-committed value along with a Merkle proof linking it to the anchored root. Verification is independent — you don't need to trust the server.

The interesting design trade-off: by doing the heavy computation (VDF) and batching (Merkle) off-chain, and only anchoring roots on-chain, you get the verifiability guarantees of on-chain randomness without per-request gas costs. One Polygon transaction covers an entire batch of values.

The VDF prevents anyone — including the operator — from predicting or manipulating future values without spending the required sequential computation time. drand adds entropy that the operator can't control. The Merkle anchor proves the values existed at a specific time.

**Current state:** Live Telegram bot with real proofs. Anchoring on Polygon Amoy testnet — anchor contract at [`0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8`](https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8). Mainnet migration planned after more production hours. Code will be open-sourced before broader launch.

No token, no fees. Curious whether anyone sees issues with the pre-commitment model for high-frequency use cases.

Bot: t.me/OpenRNG_Dice_Bot

**⚠️ Note:** Do NOT post this until the GitHub repo is public. HN has zero tolerance for "code coming soon" — post when the code is live.
