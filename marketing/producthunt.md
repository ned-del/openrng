# Product Hunt Listing

## Tagline

Provably fair dice bot for Telegram — every roll is pre-committed and verified on-chain.

## Description

OpenRNG Dice Bot generates random numbers that are cryptographically committed before you request them. Using VDFs (Verifiable Delay Functions), drand public randomness, Merkle trees, and Polygon on-chain anchoring, every roll is provably fair and independently verifiable.

**How it works:** Numbers are pre-generated and locked into Merkle trees. The Merkle root is anchored on Polygon with a timestamp. When you roll, the bot reveals a value that already existed — and gives you the proof.

**Use it on Telegram:**
- /roll — Dice rolls (any sides, any count)
- /flip — Coin flips
- /pick — Random selection from a list
- /shuffle — Randomize order
- /raffle — Fair giveaway draws
- /lottery — Number draws
- /wheel — Weighted random wheel
- /teams — Split into balanced teams
- /verify — Check any result's cryptographic proof

Works inline — type @OpenRNG_Dice_Bot in any Telegram chat.

**For developers:** The full codebase is being prepared for open-source release. Self-hosting will be fully supported.

**Pricing:** Free. Forever. Self-hostable. No paid tier.

**Current status:** Live on Polygon Amoy testnet. Mainnet migration planned.

No token. No fees. Just fair randomness.

## Maker Comment (First Comment)

Hey PH 👋

I built OpenRNG because I got tired of the "is this actually random?" question.

Every dice bot, lottery app, and giveaway tool asks you to trust that the server is honest. OpenRNG flips that — the numbers are generated and cryptographically committed before anyone asks for them. You don't trust us. You verify.

The pipeline: VDF computation → drand beacon entropy → Merkle tree batching → Polygon on-chain anchoring. When you /roll, you're revealing a pre-committed value, not generating a new one.

I'll be honest about where this is: the bot is fully working, the cryptographic pipeline is real, and proofs are being anchored on Polygon's Amoy testnet. Mainnet and open-source release are coming — I didn't want to rush those just to have a link on launch day.

This isn't a crypto project in the "buy our token" sense. There's no token. It's infrastructure — verifiable randomness as a public utility.

Try it in Telegram: t.me/OpenRNG_Dice_Bot

Curious: would you use this for community giveaways, game nights, or something else entirely?

## Key Features

- 🔒 **Pre-committed randomness** — Numbers exist before you ask
- 🌳 **Merkle proof verification** — Every result has a cryptographic proof
- ⛓️ **Polygon on-chain anchoring** — Tamper-proof timestamps (Amoy testnet, mainnet coming)
- 🎲 **10+ commands** — Roll, flip, pick, shuffle, raffle, lottery, wheel, teams
- 💬 **Inline mode** — Use in any Telegram chat
- 🆓 **Free forever** — No subscriptions, no API keys, no paid tier
- 🔓 **Open source** — Full codebase release in progress

## Categories

- Developer Tools
- Bots
- Crypto
- Open Source
- Telegram

## Topics

- Randomness
- Cryptography
- Telegram Bots
- Blockchain
- Fair Gaming
